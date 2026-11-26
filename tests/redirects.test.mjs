import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseRedirects, redirectMatches } from "./smoke/smoke.mjs";
import { getPublicPaths } from "../src/routes";
import { industries } from "../src/constants/industries";
import { PUBLISHED_INDUSTRIES } from "../src/content/industries/industries";

// STS-039: public/_redirects carries the 301s for the retired enterprise solution and industry
// pages. vitest runs from the repo root (vitest.config.ts); jsdom makes import.meta.url non-file.
const ROOT = process.cwd();
const rules = parseRedirects(readFileSync(resolve(ROOT, "public", "_redirects"), "utf8"));
const live = new Set(getPublicPaths());
const solutionIds = JSON.parse(readFileSync(resolve(ROOT, "data", "solutions.json"), "utf8")).map((s) => s.id);

/** Where Cloudflare sends `path`: the first matching rule's target, or null. */
const resolveRedirect = (path) => rules.find((r) => redirectMatches(r.from, path))?.to ?? null;

/** Every URL the retired routes used to serve (src/routes.tsx before STS-039, and /realisation before STS-057). */
// STS-042: /industries is a live hub (so no longer retired) as soon as an industry page is published.
const INDUSTRIES_LIVE = PUBLISHED_INDUSTRIES.length > 0;
const RETIRED = [
  "/solutions",
  ...solutionIds.map((id) => `/solutions/${id}`),
  ...(INDUSTRIES_LIVE ? [] : ["/industries"]),
  ...industries.map((i) => `/industry/${i.id}`),
  "/realisation",
];

/**
 * STS-025: URLs the FIRST versions of the site routed (git history of src/App.tsx, commits
 * 9928cf6 and ae71113), before the data-driven /solutions/:id pages and /realisation existed.
 */
const EARLY_RETIRED = ["/solutions/cloud-platform", "/solutions/data-analytics", "/solutions/enterprise-software", "/success-stories"];

/** Pages that never existed or have no public equivalent: they must stay a real 404, not a 301. */
const MUST_404 = ["/auth", "/dashboard", "/newsroom", "/documentation", "/support"];

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
    if (!INDUSTRIES_LIVE) expect(resolveRedirect("/industries")).toBe("/services");
    expect(resolveRedirect("/industry/enterprise")).toBe("/services");
    // Never the home page by default (07-ANALYTICS-AND-SEO.md 3.4).
    expect(rules.filter((r) => r.to === "/")).toEqual([]);
  });

  it("catches a trailing slash and an unknown slug under the retired prefixes", () => {
    expect(resolveRedirect("/solutions/")).toBe("/services");
    expect(resolveRedirect("/solutions/old-slug")).toBe("/services");
    if (!INDUSTRIES_LIVE) expect(resolveRedirect("/industries/")).toBe("/services");
    expect(resolveRedirect("/industry/anything")).toBe("/services");
  });
});

describe("public/_redirects: /industries and the industry pages (STS-042)", () => {
  it("301s /industries and /industries/ only while no industry page is published", () => {
    for (const path of ["/industries", "/industries/"]) {
      if (INDUSTRIES_LIVE) expect(resolveRedirect(path), `${path}: delete the line from public/_redirects`).toBeNull();
      else expect(resolveRedirect(path), path).toBe("/services");
    }
  });

  it("never redirects a published industry page, and always keeps the old /industry URLs redirected", () => {
    for (const e of PUBLISHED_INDUSTRIES) expect(resolveRedirect(`/industries/${e.slug}`), e.slug).toBeNull();
    expect(resolveRedirect("/industry")).toBe("/services");
    expect(resolveRedirect("/industry/enterprise")).toBe("/services");
  });
});

describe("public/_redirects: Our Work URL (STS-057, GAP-12)", () => {
  it("serves Our Work at /our-work, not at the French slug", () => {
    expect(live.has("/our-work")).toBe(true);
    expect(live.has("/realisation")).toBe(false);
  });

  it("sends /realisation, its trailing slash and anything under it to /our-work in one 301", () => {
    for (const path of ["/realisation", "/realisation/", "/realisation/old-project"]) {
      expect(resolveRedirect(path), path).toBe("/our-work");
      expect(rules.find((r) => redirectMatches(r.from, path))?.status, path).toBe(301);
    }
    expect(resolveRedirect("/our-work")).toBeNull();
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

describe("public/_redirects: full retired-URL audit (STS-025)", () => {
  it("covers the early-history URLs too, each to its closest live page in one hop", () => {
    for (const path of EARLY_RETIRED) {
      expect(live.has(path), `${path} is routed again`).toBe(false);
      const to = resolveRedirect(path);
      expect(to, `${path} has no redirect`).not.toBeNull();
      expect(live.has(to), `${path} -> ${to} is not live`).toBe(true);
      expect(resolveRedirect(to), `${path} -> ${to} chains`).toBeNull();
    }
    expect(resolveRedirect("/solutions/enterprise-software")).toBe("/services/app-development");
    expect(resolveRedirect("/solutions/cloud-platform")).toBe("/services");
    expect(resolveRedirect("/solutions/data-analytics")).toBe("/services");
    for (const path of ["/success-stories", "/success-stories/", "/success-stories/old-case"]) {
      expect(resolveRedirect(path), path).toBe("/our-work");
    }
    expect(resolveRedirect("/industry")).toBe("/services");
  });

  it("matches the static rule, not the splat, for every explicitly mapped retired page", () => {
    // A static rule listed after a splat that also matches would never fire (first match wins).
    for (const r of rules.filter((x) => !x.from.endsWith("*"))) {
      const first = rules.find((x) => redirectMatches(x.from, r.from));
      expect(first, `line ${r.line} ${r.from} is shadowed by line ${first?.line} ${first?.from}`).toBe(r);
    }
  });

  it("only sends visitors to a fixed path on this site: no external host, placeholder or query (no open redirect)", () => {
    for (const r of rules) {
      expect(r.to, `line ${r.line}`).toMatch(/^\/[a-z0-9-]*(\/[a-z0-9-]+)*$/);
      expect(r.to.startsWith("//"), `line ${r.line} is protocol-relative`).toBe(false);
      expect(r.to, `line ${r.line} forwards a splat or placeholder`).not.toMatch(/[:*?#]/);
      expect(r.from, `line ${r.line} source has a placeholder`).not.toMatch(/(^|\/):/);
      expect(r.from, `line ${r.line} source must be a path`).toMatch(/^\//);
    }
  });

  it("never sends a retired URL to the home page", () => {
    for (const path of [...RETIRED, ...EARLY_RETIRED]) expect(resolveRedirect(path), path).not.toBe("/");
  });

  it("leaves URLs with no public equivalent as a real 404 instead of a blanket redirect", () => {
    for (const path of MUST_404) {
      expect(live.has(path), path).toBe(false);
      expect(resolveRedirect(path), path).toBeNull();
    }
  });

  it("keeps host-level redirects out of this file (they are a Cloudflare rule: docs/ops/canonical-host.md)", () => {
    for (const r of rules) {
      expect(r.from, `line ${r.line}`).not.toMatch(/^https?:/i);
      expect(r.to, `line ${r.line}`).not.toMatch(/^https?:/i);
    }
  });
});
