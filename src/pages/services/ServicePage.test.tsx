import { describe, it, expect } from "vitest";
import { render } from "@/entry-server";
import { getPublicPaths } from "@/routes";
import { SITE_URL, buildHeadTags, getSeo } from "@/seo/seo";
import { bookingHref } from "@/config/business";
import { SERVICES } from "@/components/home/content";
import { SERVICE_PAGES, servicePath, serviceProjects, type ServiceSlug } from "@/content/services/services";
import { SERVICE_ROUTES } from "../../../tests/smoke/smoke.mjs";
import { CONSULTATION_CTA_LABEL } from "@/content/cta";
import { contactHrefFor } from "@/content/forms/contact-context";

// STS-032. Each page is rendered exactly as the build prerenders it (entry-server), then read as
// a document, so these assertions hold for the HTML a crawler or a no-JS visitor gets.
const parse = (path: string) => new DOMParser().parseFromString(render(path), "text/html");
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The sections each page must have, from the source's Pages table (REQ-022…026). */
const REQUIRED_SECTIONS: Record<ServiceSlug, string[]> = {
  "website-design": ["included", "samples", "price", "timeline", "faq"],
  "app-development": ["types", "examples", "process", "price"],
  "local-seo": ["google-business-profile", "reviews", "local-rankings", "monthly-reporting"],
  "social-media-marketing": ["platforms", "content-plan", "ownership", "price"],
  "paid-ads": ["google-and-meta", "tracking", "management-fee"],
};

/** Banned or unconfirmed wording (REQ-011, REQ-012, REQ-016, REQ-058, I-12, C8, C10, C12). */
const FORBIDDEN: RegExp[] = [
  /enterprise/i,
  /digital transformation/i,
  /transform your/i,
  /pay for themselves/i,
  /fixed price/i,
  /fixed quote/i,
  /30-minute/i,
  /no surprises/i,
  /guarantee/i,
  /#1\b/,
  /\bbest\b/i,
  /testimonial/i,
  /stars? from/i,
];
/** A price in any form, including the source's unfilled brackets ("Starting at [$X]"). */
const PRICE = /\$\s?\d|\[\$?X\]|\$X|\bfrom \$|\d+\s?(?:USD|dollars)\b/i;
/** A metric or count: percentages, "10+", "3x". */
const METRIC = /\d+\s?%|\d+\+|\b\d+x\b/i;

const routed = new Set(getPublicPaths());

describe.each(SERVICE_PAGES)("service page /services/$slug (STS-032)", (page) => {
  const path = servicePath(page.slug);
  const doc = parse(path);
  const main = doc.querySelector("main") as HTMLElement;
  const body = text(main);

  it("is a public, prerendered route with exactly one h1, the page's own", () => {
    expect(routed).toContain(path);
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe(page.h1);
    expect(SERVICE_ROUTES.find((r) => r.path === path)?.expectH1).toBe(page.h1);
  });

  it("has every element the source's Pages table asks for, in the HTML", () => {
    for (const id of REQUIRED_SECTIONS[page.slug]) {
      const section = main.querySelector(`[data-service-section="${id}"]`);
      expect(section, `section ${id}`).not.toBeNull();
      expect(text(section?.querySelector("h2") ?? null)).not.toBe("");
    }
  });

  it("contains no banned phrase, no price and no metric", () => {
    for (const re of [...FORBIDDEN, PRICE, METRIC]) expect(body, String(re)).not.toMatch(re);
  });

  it("sends every internal link to an existing route", () => {
    const internal = [...main.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "").filter((h) => h.startsWith("/"));
    expect(internal.length).toBeGreaterThan(0);
    // FF-10 (design audit B6): the consultation link may carry `?service=<slug>`; the route is the path.
    for (const href of internal) expect(routed, `link ${href}`).toContain(href.split(/[?#]/)[0]);
  });

  it("books through the business config and sends the free-audit CTA to an existing route", () => {
    const byText = (label: string) => [...main.querySelectorAll("a")].find((a) => text(a) === label);
    // FF-10 (design audit B6): the consultation CTA names this service, so the form preselects it.
    expect(byText(CONSULTATION_CTA_LABEL)?.getAttribute("href")).toBe(contactHrefFor({ service: page.slug }, bookingHref()));
    expect(main.querySelector('a[href*="calendly"]')).toBeNull();
    expect(byText("Get My Free Audit")?.getAttribute("href")).toBe("/free-audit");
  });

  it("opens external links only to allow-listed projects, safely and announced", () => {
    const allowed = new Set(SERVICE_PAGES.flatMap((p) => p.sections).flatMap((s) => (s.kind === "projects" ? serviceProjects(s.projects) : [])).map((p) => p.link));
    for (const a of main.querySelectorAll('a[href^="http"]')) {
      expect(allowed).toContain(a.getAttribute("href"));
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
      expect(a.getAttribute("aria-label")).toMatch(/\(opens in a new tab\)$/);
    }
  });

  it("links to the four other service pages", () => {
    const nav = main.querySelector('[data-service-section="other-services"]') as HTMLElement;
    const hrefs = [...nav.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs.sort()).toEqual(SERVICE_PAGES.filter((p) => p.slug !== page.slug).map((p) => servicePath(p.slug)).sort());
  });

  it("keeps a logical heading order and gives every link an accessible name", () => {
    const levels = [...main.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((l, i) => expect(l - levels[i]).toBeLessThanOrEqual(1));
    for (const a of main.querySelectorAll("a")) expect(a.getAttribute("aria-label") || text(a)).not.toBe("");
  });

  it("gives the standalone 'See all our work' link a 44 px touch target", () => {
    const proof = main.querySelector("[data-service-proof-link]");
    if (!page.sections.some((s) => s.kind === "projects")) return expect(proof).toBeNull();
    expect(text(proof)).toBe("See all our work");
    const classes = (proof?.className ?? "").split(/\s+/);
    for (const cls of ["inline-flex", "items-center", "min-h-11"]) expect(classes).toContain(cls);
  });

  it("renders no image, so no stock photo can read as team or client (REQ-015)", () => {
    expect(main.querySelectorAll("img")).toHaveLength(0);
  });
});

describe("service page copy rules (REQ-024, REQ-025, REQ-026, REQ-057, REQ-058)", () => {
  const main = (slug: ServiceSlug) => parse(servicePath(slug)).querySelector("main") as HTMLElement;

  it("states account ownership word for word and names no social platform until C9 confirms one", () => {
    const social = text(main("social-media-marketing"));
    expect(social).toContain("You always own your accounts.");
    expect(social).not.toMatch(/Facebook|Instagram|TikTok|LinkedIn|Twitter|YouTube|Pinterest/);
  });

  it("heads the ads page 'Track every ad dollar' and keeps ad spend separate from the fee", () => {
    const ads = main("paid-ads");
    expect(text(ads.querySelector("h1"))).toBe("Track every ad dollar");
    expect(text(ads.querySelector('[data-service-section="management-fee"]'))).toMatch(/ad spend is separate from our fee/i);
    expect(text(ads)).toMatch(/Google/);
    expect(text(ads)).toMatch(/Meta/);
  });

  it("asks every customer for a review, neutrally: no filtering and no incentive", () => {
    const reviews = text(main("local-seo").querySelector('[data-service-section="reviews"]'));
    expect(reviews).toMatch(/every customer/i);
    expect(reviews).not.toMatch(/happy|satisfied|discount|free month|reward|incentive|5-star|five-star/i);
  });

  it("shows samples only from the verified projects, with no metric", () => {
    for (const slug of ["website-design", "app-development"] as const) {
      const cards = main(slug).querySelectorAll('[data-service-section] li h3 + p');
      expect(cards.length).toBeGreaterThan(0);
    }
    expect(serviceProjects(["iSaraya", "Saraya Auto Rental", "SarayaTech Senegal"])).toEqual([]);
  });
});

describe("service page SEO (STS-032, REQ-039, REQ-040, REQ-078)", () => {
  const seo = SERVICE_PAGES.map((p) => ({ page: p, seo: getSeo(servicePath(p.slug)) }));

  it("gives each page its own title, description and self-canonical", () => {
    for (const { page, seo: s } of seo) {
      expect(s.noindex).toBeUndefined();
      expect(s.path).toBe(servicePath(page.slug));
      const canonical = buildHeadTags(s).find((t) => t.key === "canonical");
      expect(canonical?.attrs.href).toBe(`${SITE_URL}${servicePath(page.slug)}`);
      // The meta description is written for the click, not a copy of the h1.
      expect(s.description).not.toBe(page.h1);
      expect(s.title).toMatch(/Columbus, OH/);
    }
    const all = getPublicPaths().map(getSeo);
    expect(new Set(all.map((s) => s.title)).size).toBe(all.length);
    expect(new Set(all.map((s) => s.description)).size).toBe(all.length);
  });

  it("puts each page's keyword in its title (keyword map, 08 section 7)", () => {
    expect(getSeo("/services/website-design").title).toMatch(/Website Design in Columbus/);
    expect(getSeo("/services/app-development").title).toMatch(/Developer in Columbus/);
    expect(getSeo("/services/local-seo").title).toMatch(/Local SEO/);
  });
});

describe("links into the service pages (REQ-006, REQ-070)", () => {
  it("points the five home offerings at their /services/* pages", () => {
    const hrefs = SERVICES.pillars.flatMap((p) => p.offerings).map((o) => o.href);
    expect(hrefs).toEqual(SERVICE_PAGES.map((p) => servicePath(p.slug)));

    const home = parse("/").querySelector('[data-home-section="services"]') as HTMLElement;
    const rendered = [...home.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(rendered).toEqual(SERVICE_PAGES.map((p) => servicePath(p.slug)));
  });

  it("lists all five service pages in the footer's Services navigation, on every page", () => {
    const doc = parse("/about");
    const nav = doc.querySelector('footer nav[aria-label="Services"]') as HTMLElement;
    const hrefs = [...nav.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const p of SERVICE_PAGES) expect(hrefs).toContain(servicePath(p.slug));
  });
});
