import { describe, it, expect, vi } from "vitest";

// STS-050. The same prerender check with a GA4 id configured: the id may switch the privacy text,
// but the HTML still carries no tag, no gtag call, no Google host and no banner, because analytics
// is mounted only in the browser and only after consent.
vi.mock("@/config/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/analytics")>();
  return { ...actual, GA4_ID: "G-TEST1234", analyticsConfigured: () => true };
});

const { render, paths, NOT_FOUND_PATH, getSeo, renderHeadTags, renderJsonLd } = await import("@/entry-server");
const { ANALYTICS_HTML_MARKERS } = await import("../tests/smoke/smoke.mjs");

const PAGES = [...paths, NOT_FOUND_PATH];
const pageHtml = (url: string) => [renderHeadTags(getSeo(url)), renderJsonLd(url), render(url)].join("\n");

describe("prerendered HTML carries no analytics, even with a GA4 id set", () => {
  it.each(PAGES)("%s", (url) => {
    const html = pageHtml(url).toLowerCase();
    for (const marker of ANALYTICS_HTML_MARKERS) expect(html).not.toContain(marker.toLowerCase());
    expect(html).not.toContain("g-test1234");
  });

  it("the id does reach the privacy page text (the switch is live), so the check above is not vacuous", () => {
    expect(render("/privacy")).toMatch(/If you accept, we use Google Analytics/);
  });
});
