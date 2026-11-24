import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { render } from "@/entry-server";
import { bookingHref } from "@/config/business";
import { getSeo } from "@/seo/seo";
import { getPublicPaths } from "@/routes";
import { FREE_AUDIT_PATH, PACKAGES, PRICING_PATH } from "@/components/home/content";
import {
  PRICING_CUSTOM,
  PRICING_HERO,
  PRICING_PACKAGES,
  formatPrice,
} from "@/content/pricing/pricing";
import { PriceCard } from "@/pages/Pricing";
import { PRICING_FORBIDDEN_PHRASES, buildRoutes } from "../../tests/smoke/smoke.mjs";

// STS-033. /pricing is rendered exactly as the build prerenders it (entry-server), then read as a
// document, so these assertions hold for the HTML a crawler or no-JS visitor gets.
const toDoc = (html: string) => new DOMParser().parseFromString(html, "text/html");
const doc = toDoc(render("/pricing"));
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const cards = () => [...main.querySelectorAll("[data-package-card]")] as HTMLElement[];
const cardNamed = (name: string) => cards().find((c) => text(c.querySelector("h3")) === name) as HTMLElement;

describe("Pricing page (STS-033, REQ-027, REQ-065)", () => {
  it("has exactly one h1, wired into the smoke test", () => {
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe(PRICING_HERO.headline);
    expect(buildRoutes().find((r) => r.path === "/pricing")?.expectH1).toBe(PRICING_HERO.headline);
  });

  it("shows exactly 3 package cards and 1 separate custom-quote card", () => {
    expect(main.querySelectorAll('[data-package-card="package"]')).toHaveLength(3);
    expect(main.querySelectorAll('[data-package-card="custom"]')).toHaveLength(1);
    expect(cards()).toHaveLength(4);
    expect(cards().map((c) => text(c.querySelector("h3")))).toEqual([
      "Local Starter",
      "Local Growth",
      "Full Growth",
      "Custom App or Software",
    ]);
    // The custom card is outside the packages section (a quote entry, not a tier, I-2).
    const custom = main.querySelector('[data-package-card="custom"]') as HTMLElement;
    expect(custom.closest('[data-pricing-section="packages"]')).toBeNull();
  });

  it("lists the inclusions the requirements name (REQ-066 to REQ-069)", () => {
    const has = (name: string, ...parts: string[]) => parts.forEach((p) => expect(text(cardNamed(name))).toContain(p));
    has("Local Starter", "5-page website", "Google Business Profile setup", "Review system");
    has("Local Growth", "Website", "Local SEO", "2 social platforms", "Monthly report");
    has("Full Growth", "Everything in Local Growth", "Google and Meta ads management", "Quarterly strategy call");
    has("Custom App or Software", "Scoping", "Design", "Build", "Support");
  });

  it("uses neutral review wording: no filtering or incentive (REQ-074)", () => {
    expect(text(main)).not.toMatch(/happy|positive review|5-star|five-star|free .* for (a )?review|discount/i);
  });

  it("shows NO number while prices are null (C8), only quote wording", () => {
    expect(text(main)).not.toContain("$");
    expect(main.innerHTML).not.toContain("$");
    for (const name of ["Local Starter", "Local Growth", "Full Growth"]) {
      expect(text(cardNamed(name).querySelector("[data-price]"))).toBe("Get a fixed quote");
      expect(cardNamed(name).getAttribute("data-price-state")).toBe("quote");
    }
    expect(text(cardNamed("Custom App or Software").querySelector("[data-price]"))).toBe("Custom quote");
    expect(text(cardNamed("Full Growth"))).toContain("Ad spend is billed separately");
  });

  it("makes no promise beyond the source: no fixed-price, guarantee or result claim", () => {
    const t = text(main);
    for (const phrase of PRICING_FORBIDDEN_PHRASES) expect(t).not.toContain(phrase);
    expect(t).not.toMatch(/guarantee|30-minute|within \d+ (hours|days)|% /i);
  });

  it("has a title of at most 60 characters, a description and a canonical path", () => {
    const seo = getSeo("/pricing");
    expect(seo.title.length).toBeLessThanOrEqual(60);
    expect(seo.description.length).toBeGreaterThan(50);
    expect(seo.path).toBe("/pricing");
    expect(seo.noindex).toBeFalsy();
    expect(getPublicPaths()).toContain("/pricing");
  });
});

describe("Pricing page calls to action", () => {
  it("sends every card and the booking CTAs to bookingHref(), and offers the free audit", () => {
    for (const c of cards()) expect(c.querySelector("a")?.getAttribute("href")).toBe(bookingHref());
    const booking = [...main.querySelectorAll("a")].filter((a) => text(a).startsWith("Book a Free Consultation"));
    expect(booking.length).toBeGreaterThanOrEqual(1);
    for (const a of booking) expect(a.getAttribute("href")).toBe(bookingHref());
    const audit = [...main.querySelectorAll("a")].find((a) => text(a) === "Get My Free Audit");
    expect(audit?.getAttribute("href")).toBe(FREE_AUDIT_PATH);
  });

  it("is linked from the home teaser and the footer", () => {
    const home = toDoc(render("/"));
    const teaser = home.querySelector('[data-home-section="packages"]') as HTMLElement;
    const link = [...teaser.querySelectorAll("a")].find((a) => text(a) === PACKAGES.cta);
    expect(PRICING_PATH).toBe("/pricing");
    expect(link?.getAttribute("href")).toBe("/pricing");
    expect(home.querySelector('footer a[href="/pricing"]')).not.toBeNull();
  });
});

describe("Pricing prices render once the owner supplies them (C8)", () => {
  const html = (card: Parameters<typeof PriceCard>[0]["card"], kind: "package" | "custom") =>
    toDoc(
      renderToStaticMarkup(
        <MemoryRouter>
          <ul>
            <PriceCard card={card} kind={kind} href="/contact" />
          </ul>
        </MemoryRouter>,
      ),
    );
  const [starter, growth, full] = PRICING_PACKAGES.packages;

  it("formats each price kind as the requirements word it", () => {
    expect(formatPrice("one-time", 1500)).toBe("one-time $1,500");
    expect(formatPrice("monthly", 499)).toBe("$499/mo");
    expect(formatPrice("monthly-plus-ad-spend", 999)).toBe("$999/mo + ad spend");
    expect(formatPrice("quote-from", 3000)).toBe("quote from $3,000");
  });

  it("treats null and bad values as unset: never prints $NaN", () => {
    expect(formatPrice("monthly", null)).toBeNull();
    expect(formatPrice("monthly", Number.NaN)).toBeNull();
    expect(formatPrice("monthly", -5)).toBeNull();
  });

  it("renders the formatted price on a card instead of the quote wording", () => {
    const set = html({ ...starter, price: 1500 }, "package");
    const card = set.querySelector("[data-package-card]") as HTMLElement;
    expect(text(card.querySelector("[data-price]"))).toBe("one-time $1,500");
    expect(card.getAttribute("data-price-state")).toBe("set");

    expect(text(html({ ...growth, price: 499 }, "package").querySelector("[data-price]"))).toBe("$499/mo");
    expect(text(html({ ...full, price: 999 }, "package").querySelector("[data-price]"))).toBe("$999/mo + ad spend");
    expect(text(html({ ...PRICING_CUSTOM.card, price: 3000 }, "custom").querySelector("[data-price]"))).toBe(
      "quote from $3,000",
    );
  });

  it("falls back to the quote wording when the price is null", () => {
    expect(text(html(starter, "package").querySelector("[data-price]"))).toBe("Get a fixed quote");
    expect(text(html(PRICING_CUSTOM.card, "custom").querySelector("[data-price]"))).toBe("Custom quote");
  });
});
