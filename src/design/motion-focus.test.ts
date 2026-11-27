import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

// STS-041 (WCAG 2.3.3 / 2.2.2 / 2.4.7). The rules live in src/index.css; this reads them so that a
// refactor that drops the reduced-motion block or the base focus indicator fails here.
const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");

function block(startPattern: RegExp): string {
  const start = css.search(startPattern);
  expect(start, String(startPattern)).toBeGreaterThanOrEqual(0);
  // Balanced braces from the first "{" after the match.
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error("unbalanced CSS");
}

describe("reduced motion (STS-041)", () => {
  const reduced = block(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);

  it("stops every CSS animation, including the infinite hero loops, and makes transitions instant", () => {
    expect(reduced).toMatch(/\*,\s*\*::before,\s*\*::after/);
    expect(reduced).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(reduced).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(reduced).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it("defines no infinite animation at all (STS-068: the unused looping decorations were removed)", () => {
    // Comments may mention the word; no declaration may use it.
    const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(/infinite/);
    for (const cls of ["grid-animated", "float-circle-1", "float-circle-2", "float-circle-3"]) {
      expect(code).not.toContain(`.${cls}`);
    }
  });
});

describe("base keyboard focus indicator (STS-041)", () => {
  const focus = block(/:focus-visible:not\(\[tabindex="-1"\]\)\s*\{/);

  it("draws a solid 2 px --ring outline with an offset halo for controls without their own ring", () => {
    expect(focus).toMatch(/outline:\s*2px solid hsl\(var\(--ring\)\)/);
    expect(focus).toMatch(/outline-offset:\s*2px/);
    expect(focus).toMatch(/box-shadow:\s*0 0 0 2px hsl\(var\(--background\)\)/);
  });

  it("is never switched off globally", () => {
    expect(css).not.toMatch(/:focus(-visible)?\s*\{[^}]*outline:\s*(none|0)/);
  });
});

describe("fixed header scroll offset (design audit B1, FD-11)", () => {
  const html = block(/\n\s*html\s*\{/);
  const header = readFileSync(resolve(__dirname, "../components/Header.tsx"), "utf8");

  it("keeps a focused field or an in-page target below the fixed header", () => {
    expect(html).toMatch(/scroll-padding-top:\s*calc\(var\(--header-h\)\s*\+\s*1rem\)/);
  });

  it("--header-h matches the header bar height (h-20 = 5rem)", () => {
    expect(css).toMatch(/--header-h:\s*5rem;/);
    expect(header).toMatch(/\bh-20\b/);
  });
});

describe("motion tokens (design audit B1, section 3.7)", () => {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("never animates `all` and has no bounce curve", () => {
    expect(code).not.toMatch(/transition:\s*all/);
    expect(code).not.toMatch(/--transition-bounce|cubic-bezier\(0\.68,\s*-0\.55/);
  });

  it("dropped the 30-50 px entrance keyframes", () => {
    for (const name of ["fadeInUp", "slideInRight", "scaleIn"]) expect(code).not.toContain(name);
  });
});
