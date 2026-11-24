import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// vitest runs from the repo root (vitest.config.ts); jsdom makes import.meta.url non-file.
const HEADERS_FILE = resolve(process.cwd(), "public", "_headers");

/** Parse the Cloudflare Pages _headers format into { path: { header-lowercase: value } }. */
export function parseHeaders(text) {
  const rules = {};
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      current = raw.trim();
      rules[current] = {};
      continue;
    }
    if (!current) throw new Error(`header line before any path: ${raw}`);
    const idx = raw.indexOf(":");
    if (idx < 0) throw new Error(`malformed header line: ${raw}`);
    rules[current][raw.slice(0, idx).trim().toLowerCase()] = raw.slice(idx + 1).trim();
  }
  return rules;
}

function directives(csp) {
  return Object.fromEntries(
    csp
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...sources] = d.split(/\s+/);
        return [name, sources];
      }),
  );
}

const rules = parseHeaders(readFileSync(HEADERS_FILE, "utf8"));
const site = rules["/*"];

describe("public/_headers (STS-015)", () => {
  it("sets the baseline security headers on every route", () => {
    expect(site["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
    expect(site["x-frame-options"]).toBe("DENY");
    expect(site["x-content-type-options"]).toBe("nosniff");
    expect(site["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(site["permissions-policy"]).toMatch(/camera=\(\)/);
    expect(site["permissions-policy"]).toMatch(/microphone=\(\)/);
    expect(site["permissions-policy"]).toMatch(/geolocation=\(\)/);
  });

  it("drafts a report-only CSP limited to the origins the site uses", () => {
    expect(site["content-security-policy"]).toBeUndefined();
    const csp = directives(site["content-security-policy-report-only"]);

    expect(csp["default-src"]).toEqual(["'self'"]);
    expect(csp["script-src"]).toEqual(["'self'"]);
    expect(csp["connect-src"]).toEqual(["'self'", "https://*.sarayatechsolutions.com"]);
    expect(csp["frame-src"]).toEqual(["https://www.google.com"]);
    expect(csp["style-src"]).toContain("https://fonts.googleapis.com");
    expect(csp["font-src"]).toContain("https://fonts.gstatic.com");
    expect(csp["object-src"]).toEqual(["'none'"]);
  });

  it("never allows the browser to reach an AI provider or run eval", () => {
    const csp = site["content-security-policy-report-only"];
    expect(csp).not.toMatch(/openai/i);
    expect(csp).not.toMatch(/unsafe-eval/);
    expect(directives(csp)["script-src"]).not.toContain("'unsafe-inline'");
  });

  it("caches fingerprinted build assets immutably", () => {
    expect(rules["/assets/*"]["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("keeps every header within the Cloudflare Pages 2000-character limit", () => {
    for (const headers of Object.values(rules)) {
      for (const [name, value] of Object.entries(headers)) {
        expect(`${name}: ${value}`.length).toBeLessThanOrEqual(2000);
      }
    }
  });
});
