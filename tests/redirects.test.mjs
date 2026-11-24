import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseRedirects, redirectMatches } from "./smoke/smoke.mjs";
import { getPublicPaths } from "../src/routes";
import { industries } from "../src/constants/industries";

// STS-039: public/_redirects carries the 301s for the retired enterprise solution and industry
// pages. vitest runs from the repo root (vitest.config.ts); jsdom makes import.meta.url non-file.
const ROOT = process.cwd();
const rules = parseRedirects(readFileSync(resolve(ROOT, "public", "_redirects"), "utf8"));
const live = new Set(getPublicPaths());
const solutionIds = JSON.parse(readFileSync(resolve(ROOT, "data", "solutions.json"), "utf8")).map((s) => s.id);

/** Where Cloudflare sends `path`: the first matching rule's target, or null. */
const resolveRedirect = (path) => rules.find((r) => redirectMatches(r.from, path))?.to ?? null;

/** Every URL the retired routes used to serve (src/routes.tsx before STS-039). */
const RETIRED = [
  "/solutions",
  ...solutionIds.map((id) => `/solutions/${id}`),
  "/industries",
  ...industries.map((i) => `/industry/${i.id}`),
];

describe("public/_redirects (STS-039)", () => {
  it("has rules, all permanent", () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) expect(r.status, `line ${r.line} ${r.from}`).toBe(301);
  });

  it("never redirects a live route (Cloudflare applies the redirect before the page)", () => {
    for (const r of rules) {
      const shadowed = [...live].filter((p) => redirectMatches(r.from, p));
      expect(shadowed, `line ${r.line} ${r.from}`).toEqual([]);
    }
  });

  it("sends every rule to a live, prerendered route, in one hop", () => {
    for (const r of rules) {
      expect(live.has(r.to), `line ${r.line} target ${r.to}`).toBe(true);
      expect(resolveRedirect(r.to), `line ${r.line} target ${r.to} is itself redirected`).toBeNull();
    }
  });

  it("has no duplicate source", () => {
    const froms = rules.map((r) => r.from);
    expect(new Set(froms).size).toBe(froms.length);
  });

  it("covers every URL the retired routes used to serve", () => {
    expect(RETIRED.length).toBeGreaterThan(10);
    for (const path of RETIRED) {
      expect(live.has(path), `${path} is routed again`).toBe(false);
      expect(resolveRedirect(path), `${path} has no redirect`).not.toBeNull();
    }
  });

  it("maps each retired page to its closest live page", () => {
    expect(resolveRedirect("/solutions")).toBe("/services");
    expect(resolveRedirect("/solutions/web-mobile-development")).toBe("/services/website-design");
    expect(resolveRedirect("/solutions/custom-business-software")).toBe("/services/app-development");
    expect(resolveRedirect("/solutions/ai-automation-chatbots")).toBe("/services/app-development");
    for (const id of ["cloud-infrastructure", "data-bi-solutions", "digital-strategy-consulting", "security-compliance"]) {
      expect(resolveRedirect(`/solutions/${id}`)).toBe("/services");
    }
    expect(resolveRedirect("/industries")).toBe("/services");
    expect(resolveRedirect("/industry/enterprise")).toBe("/services");
    // Never the home page by default (07-ANALYTICS-AND-SEO.md 3.4).
    expect(rules.filter((r) => r.to === "/")).toEqual([]);
  });

  it("catches a trailing slash and an unknown slug under the retired prefixes", () => {
    expect(resolveRedirect("/solutions/")).toBe("/services");
    expect(resolveRedirect("/solutions/old-slug")).toBe("/services");
    expect(resolveRedirect("/industries/")).toBe("/services");
    expect(resolveRedirect("/industry/anything")).toBe("/services");
  });
});

describe("_redirects parser", () => {
  it("reads source, target and status, skipping comments and blank lines", () => {
    expect(parseRedirects("# c\n\n/a   /b  301\n/c /d\n")).toEqual([
      { line: 3, from: "/a", to: "/b", status: 301 },
      { line: 4, from: "/c", to: "/d", status: 302 },
    ]);
  });

  it("refuses a malformed line instead of skipping it", () => {
    expect(() => parseRedirects("/only-one-field")).toThrow(/line 1/);
    expect(() => parseRedirects("/a /b 301 extra")).toThrow(/malformed/);
  });

  it("matches a splat by prefix and a static source exactly", () => {
    expect(redirectMatches("/x/*", "/x/y")).toBe(true);
    expect(redirectMatches("/x/*", "/x")).toBe(false);
    expect(redirectMatches("/x", "/x/")).toBe(false);
    expect(redirectMatches("/x", "/x")).toBe(true);
  });
});
