import { describe, it, expect } from "vitest";
import { render } from "@/entry-server";
import { bookingHref } from "@/config/business";
import { getSeo, buildSitemapXml, renderHeadTags } from "@/seo/seo";
import { getPublicPaths } from "@/routes";
import { ARTICLES, INSIGHTS_HERO } from "@/content/insights/insights";
import { INSIGHTS_FORBIDDEN_PHRASES, buildRoutes, checkNoindexHead } from "../../tests/smoke/smoke.mjs";
import { CONSULTATION_CTA_LABEL } from "@/content/cta";

// STS-040. /insights is rendered exactly as the build prerenders it (entry-server), then read as a document.
const html = render("/insights");
const doc = new DOMParser().parseFromString(html, "text/html");
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const mainText = text(main);

describe("Insights page (STS-040, REQ-018, REQ-031)", () => {
  it("has exactly one h1, and the smoke test expects the same one", () => {
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe(INSIGHTS_HERO.headline);
    expect(buildRoutes().find((r) => r.path === "/insights")?.expectH1).toBe(INSIGHTS_HERO.headline);
  });

  it("shows no article card, date, read time, category or dead Read Article button", () => {
    expect(ARTICLES).toHaveLength(0);
    expect(main.querySelectorAll("article")).toHaveLength(0);
    expect(main.querySelector("button")).toBeNull();
    expect(mainText).not.toMatch(/read article|min read|featured article|latest articles|coming soon|stay informed|subscribe/i);
    expect(mainText).not.toMatch(/\b(19|20)\d{2}\b/);
    // Every link on the page is a real destination: nothing points at a missing article.
    for (const a of main.querySelectorAll("a")) expect(a.getAttribute("href")).toMatch(/^(\/|https:\/\/)/);
  });

  it("uses none of the banned words, case-insensitively", () => {
    const lower = mainText.toLowerCase();
    for (const w of ["transform", "enterprise", "cloud", "digital transformation"]) expect(lower).not.toContain(w);
    const htmlLower = html.toLowerCase();
    for (const p of INSIGHTS_FORBIDDEN_PHRASES) expect(htmlLower).not.toContain(p.toLowerCase());
  });

  it("sends its one call to action to bookingHref()", () => {
    const ctas = [...main.querySelectorAll("a")].filter((a) => text(a).startsWith(CONSULTATION_CTA_LABEL));
    expect(ctas).toHaveLength(1);
    expect(ctas[0].getAttribute("href")).toBe(bookingHref());
  });

  it("is noindex, has no canonical, and is left out of the sitemap until the first article", () => {
    const seo = getSeo("/insights");
    expect(seo.noindex).toBe(true);
    const head = renderHeadTags(seo);
    expect(head).toMatch(/name="robots" content="noindex/);
    expect(head).not.toContain('rel="canonical"');
    const xml = buildSitemapXml(getPublicPaths());
    expect(xml).not.toContain("/insights");
    expect(xml).toContain("/about");
    expect(checkNoindexHead(`<head>${head}</head>`)).toEqual([]);
  });

  it("has a meta description that is not the h1 and no longer mentions cloud, data or AI", () => {
    const d = getSeo("/insights").description;
    expect(d).not.toContain(INSIGHTS_HERO.headline);
    expect(d.toLowerCase()).not.toMatch(/cloud|\bai\b|software/);
  });
});
