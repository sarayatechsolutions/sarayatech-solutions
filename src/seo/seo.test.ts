import { describe, it, expect } from "vitest";
import { getPublicPaths } from "@/routes";
import { LEGAL_PAGES_APPROVED } from "@/content/legal/legal";
import {
  DEFAULT_SITE_URL,
  NOT_FOUND_SEO_PATH,
  SITE_URL,
  buildHeadTags,
  buildSitemapXml,
  canonicalUrl,
  getSeo,
  normalizePath,
  normalizeSiteUrl,
  renderHeadTags,
} from "./seo";
import { DEFAULT_SITE_URL as SMOKE_DEFAULT, siteUrlFromEnv } from "../../tests/smoke/smoke.mjs";

const paths = getPublicPaths();

describe("per-route SEO data (STS-021)", () => {
  it.each(paths)("has its own title and description for %s", (p) => {
    const seo = getSeo(p);
    expect(seo.path).toBe(p);
    // Only the STS-037 legal drafts are noindex, and only until C23 approval.
    expect(seo.noindex).toBe(!LEGAL_PAGES_APPROVED && (p === "/privacy" || p === "/terms") ? true : undefined);
    expect(seo.title.length).toBeGreaterThanOrEqual(35);
    expect(seo.title.length).toBeLessThanOrEqual(60);
    expect(seo.description.length).toBeGreaterThanOrEqual(100);
    expect(seo.description.length).toBeLessThanOrEqual(160);
  });

  it("is unique across every public route", () => {
    const all = paths.map(getSeo);
    expect(new Set(all.map((s) => s.title)).size).toBe(all.length);
    expect(new Set(all.map((s) => s.description)).size).toBe(all.length);
  });

  it("makes no claim the owner has not supplied: no price, stat, rating or ranking", () => {
    for (const s of paths.map(getSeo)) {
      expect(`${s.title} ${s.description}`).not.toMatch(
        /\$\d|\d+\s?%|\d+\+|\byears?\b|\bguarantee|#1\b|\brated?\b|\breviews?\b|\bbest\b/i,
      );
    }
  });

  it("gives the retired solution and industry pages the 404 data, not indexable SEO (STS-039)", () => {
    for (const p of ["/solutions", "/solutions/cloud-infrastructure", "/industries", "/industry/enterprise"]) {
      expect(getSeo(p).noindex).toBe(true);
    }
  });

  it("gives an unknown path noindex data and no canonical", () => {
    const seo = getSeo("/nope");
    expect(seo.path).toBe(NOT_FOUND_SEO_PATH);
    const tags = buildHeadTags(seo);
    expect(tags.some((t) => t.key === "canonical")).toBe(false);
    expect(tags.find((t) => t.key === "robots")?.attrs.content).toMatch(/noindex/);
    expect(getSeo("/auth").noindex).toBe(true);
    expect(getSeo("/solutions/not-a-slug").noindex).toBe(true);
  });
});

describe("canonical host (B2 fallback)", () => {
  it("is the apex, with no trailing slash, and kept equal to the smoke script's copy", () => {
    expect(DEFAULT_SITE_URL).toBe("https://sarayatechsolutions.com");
    expect(SMOKE_DEFAULT).toBe(DEFAULT_SITE_URL);
    expect(SITE_URL).toBe(DEFAULT_SITE_URL);
  });

  it("honours an override, trims trailing slashes and refuses junk", () => {
    expect(normalizeSiteUrl("https://example.com/")).toBe("https://example.com");
    expect(siteUrlFromEnv({ VITE_SITE_URL: "https://example.com//" })).toBe("https://example.com");
    expect(normalizeSiteUrl("not a url")).toBe(DEFAULT_SITE_URL);
    expect(normalizeSiteUrl("")).toBe(DEFAULT_SITE_URL);
    expect(normalizeSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
  });

  it("builds absolute canonicals with no trailing-slash or query variants", () => {
    expect(canonicalUrl("/")).toBe(`${SITE_URL}/`);
    expect(canonicalUrl("/about/")).toBe(`${SITE_URL}/about`);
    expect(canonicalUrl("/about?utm=x#y")).toBe(`${SITE_URL}/about`);
    expect(normalizePath("")).toBe("/");
  });
});

describe("head tags", () => {
  it("emits one title, description, canonical, og and twitter set, all on the canonical host", () => {
    const html = renderHeadTags(getSeo("/about"));
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/about" />`);
    expect(html).toContain(`property="og:url" content="${SITE_URL}/about"`);
    expect(html).toContain(`property="og:image" content="${SITE_URL}/logo.png"`);
    for (const k of ["og:title", "og:description", "og:type", "twitter:card", "twitter:title", "twitter:description"]) {
      expect(html).toContain(k);
    }
    expect(html).not.toMatch(/sarayatech-solutions\.dev|aggregateRating|ld\+json/);
  });

  it("escapes markup in titles and descriptions", () => {
    expect(renderHeadTags(getSeo("/services"))).toContain("Websites, Apps &amp; Marketing");
  });
});

describe("sitemap", () => {
  it("lists exactly the public paths, absolute, with no auth, dashboard or 404", () => {
    const xml = buildSitemapXml(paths, SITE_URL, "2026-01-01");
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(paths.map((p) => `${SITE_URL}${p}`));
    expect(locs.every((l) => l.startsWith(`${SITE_URL}/`))).toBe(true);
    expect(xml).not.toMatch(/\/auth|\/dashboard|404/);
    expect(xml).toContain("<lastmod>2026-01-01</lastmod>");
  });
});
