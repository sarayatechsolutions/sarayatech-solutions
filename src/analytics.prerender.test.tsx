import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, paths, NOT_FOUND_PATH, getSeo, renderHeadTags, renderJsonLd } from "@/entry-server";
import { documentText } from "@/content/legal/legal";
import { privacyPolicy } from "@/content/legal/privacy";
import { ANALYTICS_HTML_MARKERS } from "../tests/smoke/smoke.mjs";

// STS-050 (REQ-043). What the build prerenders for every page, head and body, exactly as
// tools/prerender.mjs assembles it, plus the HTML shell. With no GA4 id (the shipped state) there is
// no trace of analytics; src/analytics.prerender-on.test.tsx proves the same with an id set.
const PAGES = [...paths, NOT_FOUND_PATH];
const pageHtml = (url: string) => [renderHeadTags(getSeo(url)), renderJsonLd(url), render(url)].join("\n");

describe("prerendered HTML carries no analytics, with no GA4 id", () => {
  it.each(PAGES)("%s", (url) => {
    const html = pageHtml(url).toLowerCase();
    for (const marker of ANALYTICS_HTML_MARKERS) expect(html).not.toContain(marker.toLowerCase());
  });

  it("the HTML shell (index.html) has no Google tag either", () => {
    const shell = readFileSync(resolve(__dirname, "../index.html"), "utf8").toLowerCase();
    for (const marker of ANALYTICS_HTML_MARKERS) expect(shell).not.toContain(marker.toLowerCase());
  });
});

describe("privacy draft follows the analytics switch (C17)", () => {
  it("off: the original sentences, word for word, and nothing about Google Analytics being used", () => {
    const off = documentText(privacyPolicy(false));
    expect(off).toContain("Our website's code does not set cookies and does not save anything in your browser's storage.");
    expect(off).toContain("We don't use Google Analytics or any other analytics, advertising or tracking service today.");
    expect(off).not.toMatch(/If you accept, we use Google Analytics/);
    expect(off).not.toMatch(/Google \(Google Analytics\) receives/);
  });

  it("on: names Google Analytics, the stored choice, the switched-off ad features and an owner placeholder", () => {
    const on = documentText(privacyPolicy(true));
    expect(on).not.toContain("We don't use Google Analytics");
    expect(on).not.toContain("does not save anything in your browser's storage");
    expect(on).toMatch(/saves one setting in your browser's storage: whether you accepted or declined analytics/);
    expect(on).toMatch(/If you accept, we use Google Analytics/);
    expect(on).toMatch(/turn off Google signals and ad personalization/);
    expect(on).toMatch(/If you decline, Google Analytics is not loaded at all/);
    expect(on).toMatch(/Google \(Google Analytics\) receives the pages you visit/);
    expect(on).toContain("[Owner to confirm: Google Analytics wording and how long Google keeps the data (C17)]");
    for (const marker of ANALYTICS_HTML_MARKERS) expect(on.toLowerCase()).not.toContain(marker);
  });
});
