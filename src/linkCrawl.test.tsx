import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { POPULATED_CONFIG } from "@/components/chrome.fixtures";
import { render as prerender } from "@/entry-server";
import { getPublicPaths } from "@/routes";
import { parseRedirects, redirectMatches } from "../tests/smoke/smoke.mjs";

// REQ-018 / STS-039: no internal link may point to a path that is not a live, prerendered route.
// A link to a redirected URL would still work (one 301 hop), but it is never accepted here: our
// own pages link to the destination, so the redirect table only serves old external links.
const live = new Set(getPublicPaths());
const redirects = parseRedirects(readFileSync(resolve(process.cwd(), "public", "_redirects"), "utf8"));

/** Root-relative app path of an href, or null for external, protocol, hash-only and asset links. */
function internalPath(href: string | null): string | null {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  const path = href.split(/[?#]/)[0].replace(/(.)\/+$/, "$1");
  return /\.[a-z0-9]+$/i.test(path) ? null : path;
}

const anchorPaths = (container: HTMLElement) =>
  [...container.querySelectorAll("a")].map((a) => internalPath(a.getAttribute("href"))).filter((p): p is string => p !== null);

/** Internal hrefs in a prerendered page's HTML. */
const htmlPaths = (html: string) =>
  [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)].map((m) => internalPath(m[1])).filter((p): p is string => p !== null);

function expectLive(paths: string[], where: string) {
  for (const p of paths) {
    const redirected = redirects.some((r) => redirectMatches(r.from, p));
    expect(live.has(p), `${where} links to ${p}${redirected ? " (a retired, redirected URL)" : " (no such route)"}`).toBe(true);
  }
}

describe("header and footer links (STS-039, REQ-018)", () => {
  for (const [label, config] of [
    ["default config", undefined],
    ["populated config", POPULATED_CONFIG],
  ] as const) {
    it(`resolve to live routes with the ${label}`, () => {
      const header = render(
        <MemoryRouter>
          <Header config={config} />
        </MemoryRouter>,
      );
      const headerPaths = anchorPaths(header.container);
      header.unmount();
      const footer = render(
        <MemoryRouter>
          <Footer config={config} />
        </MemoryRouter>,
      );
      const footerPaths = anchorPaths(footer.container);
      expect(headerPaths.length).toBeGreaterThan(0);
      expect(footerPaths.length).toBeGreaterThan(0);
      expectLive(headerPaths, `Header (${label})`);
      expectLive(footerPaths, `Footer (${label})`);
    });
  }

  it("send the header Services entry and the footer All Services link to the /services hub", () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
        <Footer />
      </MemoryRouter>,
    );
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/services");
    expect(hrefs.filter((h) => h && /^\/(solutions|industries|industry|realisation)(\/|$)/.test(h))).toEqual([]);
  });

  it("send Our Work to /our-work, and the crawl rejects a link to the old /realisation (STS-057)", () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
        <Footer />
      </MemoryRouter>,
    );
    const work = [...container.querySelectorAll("a")].filter((a) => a.textContent === "Our Work");
    expect(work.length).toBeGreaterThanOrEqual(2);
    for (const a of work) expect(a.getAttribute("href")).toBe("/our-work");
    // The guard has teeth: the old slug is redirected, not live, so a stale link fails the crawl.
    expect(() => expectLive(["/realisation"], "probe")).toThrow(/retired, redirected URL/);
  });
});

describe("link crawl of every prerendered page (REQ-018)", () => {
  it.each([...live])("%s links only to live routes", (page) => {
    expectLive(htmlPaths(prerender(page)), page);
  });
});
