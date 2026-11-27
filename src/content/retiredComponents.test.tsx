import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { NOT_FOUND_PATH, paths, render } from "@/entry-server";
import { RETIRED_FAKE_CONTENT_PHRASES } from "../../tests/smoke/smoke.mjs";

// Rendering every route cold can pass vitest's 5 s default on a loaded run; no assertion depends on it.
vi.setConfig({ testTimeout: 60_000 });

/**
 * Design audit B9 / FD-36. Five home components hold fabricated social proof (invented testimonials,
 * client "logos", stats) or retired enterprise copy. The owner's rule is that front-end code files are
 * never deleted, so they stay in the tree, marked RETIRED. This file is what keeps them inert:
 *   1. none is reachable from an entry point (main.tsx, entry-server.tsx, routes.tsx), following
 *      static and dynamic imports;
 *   2. no other source file imports one at all;
 *   3. no prerendered route (nor the 404 page) contains any of their phrases.
 * tests/smoke/smoke.mjs checks the same phrases against the built HTML in dist.
 */

const SRC = resolve(__dirname, "..");
const HOME = join(SRC, "components", "home");
const RETIRED = ["TestimonialsSection", "StatsSection", "ClientLogos", "SolutionsShowcase", "ValueProposition"];
const RETIRED_FILES = RETIRED.map((name) => join(HOME, `${name}.tsx`));
const ENTRIES = ["main.tsx", "entry-server.tsx", "routes.tsx"].map((f) => join(SRC, f));
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs"];

const isTest = (file: string) => /\.test\.(t|j)sx?$|\.test\.mjs$/.test(file);
const rel = (file: string) => relative(SRC, file).split("\\").join("/");

/** Every module specifier in a source file: `import ... from`, `export ... from`, bare `import "x"`, `import("x")`. */
function specifiers(source: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?[^'"`;]*?\bfrom\s*["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?[^'"`;]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) for (const m of source.matchAll(re)) out.push(m[1]);
  return out;
}

/** Resolves a specifier the way vite does for this project (`@/` is src/), or null for packages and assets. */
function resolveSpecifier(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null;
  const candidates = [base, ...EXTENSIONS.map((e) => base + e), ...EXTENSIONS.map((e) => join(base, `index${e}`))];
  for (const c of candidates) if (existsSync(c) && statSync(c).isFile() && EXTENSIONS.some((e) => c.endsWith(e))) return c;
  return null;
}

function reachableFrom(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of specifiers(readFileSync(file, "utf8"))) {
      const target = resolveSpecifier(spec, file);
      if (target && !seen.has(target)) queue.push(target);
    }
  }
  return seen;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = join(dir, d.name);
    if (d.isDirectory()) return sourceFiles(full);
    return EXTENSIONS.some((e) => d.name.endsWith(e)) ? [full] : [];
  });
}

const textOf = (html: string) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .toLowerCase();

describe("retired fake-content components (B9 / FD-36)", () => {
  it("keeps the five files, each marked RETIRED at the top", () => {
    for (const file of RETIRED_FILES) {
      expect(existsSync(file), rel(file)).toBe(true);
      expect(readFileSync(file, "utf8").slice(0, 600), rel(file)).toMatch(/RETIRED \(design audit B9 \/ FD-36\)/);
    }
  });

  it("the import walker follows static, re-export and dynamic imports (self-check)", () => {
    expect(
      specifiers(
        [
          'import A from "@/components/home/StatsSection";',
          'import { b } from "./b";',
          'export { c } from "../c";',
          'import "./side-effect.css";',
          'const D = lazy(() => import("@/pages/D"));',
          "import type { E } from \"./e\";",
        ].join("\n"),
      ),
    ).toEqual(expect.arrayContaining(["@/components/home/StatsSection", "./b", "../c", "./side-effect.css", "@/pages/D", "./e"]));
    // The walk from the entries reaches the real home page and the lazily loaded chat panel.
    const reached = [...reachableFrom(ENTRIES)].map(rel);
    expect(reached).toEqual(expect.arrayContaining(["pages/Index.tsx", "components/home/HeroSection.tsx", "components/chatbot/ChatPanel.tsx"]));
  });

  it("no entry point, route or page can reach a retired component", () => {
    const reached = reachableFrom(ENTRIES);
    expect(RETIRED_FILES.filter((f) => reached.has(f)).map(rel)).toEqual([]);
  });

  it("no other source file imports a retired component", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (RETIRED_FILES.includes(file) || isTest(file)) continue;
      for (const spec of specifiers(readFileSync(file, "utf8"))) {
        const target = resolveSpecifier(spec, file);
        if (target && RETIRED_FILES.includes(target)) offenders.push(`${rel(file)} -> ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the phrase list matches content that really is in the retired files", () => {
    const retiredText = RETIRED_FILES.map((f) => readFileSync(f, "utf8")).join("\n").replace(/\s+/g, " ").toLowerCase();
    for (const phrase of RETIRED_FAKE_CONTENT_PHRASES) expect(retiredText, phrase).toContain(phrase.toLowerCase());
  });

  it.each([...paths, NOT_FOUND_PATH])("the server render of %s carries none of their fake content", (path) => {
    const text = textOf(render(path));
    expect(RETIRED_FAKE_CONTENT_PHRASES.filter((p) => text.includes(p.toLowerCase()))).toEqual([]);
  });
});
