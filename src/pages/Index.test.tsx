import { describe, it, expect } from "vitest";
import { render } from "@/entry-server";
import { BUSINESS } from "@/config/business";
import { HERO, PROBLEM, FINAL_CTA, HOW_IT_WORKS, SERVICES } from "@/components/home/content";

// STS-031. The home route is rendered exactly as the build prerenders it (entry-server), then
// read as a document, so these assertions hold for the HTML a crawler or no-JS visitor gets.
const doc = new DOMParser().parseFromString(render("/"), "text/html");
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const linkByText = (label: string) =>
  [...main.querySelectorAll("a")].find((a) => text(a) === label) as HTMLAnchorElement | undefined;

describe("home page sections (STS-031, REQ-021)", () => {
  const order = [...main.querySelectorAll("[data-home-section]")].map((s) => s.getAttribute("data-home-section"));

  it("renders every section of the new homepage, in order", () => {
    expect(order).toEqual(["hero", "problem", "services", "how-it-works", "proof", "packages", "final-cta"]);
  });

  it("keeps REQ-021's five sections in its order: headline, services, proof, packages, booking CTA", () => {
    const five = ["hero", "services", "proof", "packages", "final-cta"];
    expect(order.filter((s) => five.includes(s as string))).toEqual(five);
    expect(text(main.querySelector('[data-home-section="final-cta"]'))).toMatch(/Book a free consultation/);
  });

  it("has one h1, the source headline, and the source subheadline (REQ-050)", () => {
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe("We build your website. Then we bring you customers.");
    expect(text(main)).toContain(HERO.subheadline);
  });

  it("uses the source problem heading and copy (REQ-053)", () => {
    const problem = main.querySelector('[data-home-section="problem"]');
    expect(text(problem?.querySelector("h2") ?? null)).toBe("Running a business is hard enough.");
    expect(text(problem)).toContain(PROBLEM.copy);
  });

  it("groups five offerings under three pillars (I-1, REQ-070)", () => {
    const services = main.querySelector('[data-home-section="services"]') as HTMLElement;
    expect([...services.querySelectorAll("h3")].map(text)).toEqual(["Websites", "Apps & software", "Marketing"]);
    expect([...services.querySelectorAll("h4")].map(text)).toEqual([
      "Websites that win customers",
      "Apps and custom software",
      "Get found on Google",
      "Social media done for you",
      "Track every ad dollar",
    ]);
    expect(text(services)).toContain("You always own your accounts.");
    // No social platform is named until C9 confirms which ones are sold.
    expect(text(services)).not.toMatch(/Facebook|Instagram|TikTok|LinkedIn/);
    for (const o of SERVICES.pillars.flatMap((p) => p.offerings)) expect(linkByText(o.linkLabel)).toBeDefined();
  });

  it("lists the four steps in order (REQ-059)", () => {
    const steps = [...main.querySelectorAll('[data-home-section="how-it-works"] ol > li h3')].map(text);
    expect(steps).toEqual(HOW_IT_WORKS.steps.map((s) => s.title));
    expect(steps).toHaveLength(4);
  });

  it("shows three package cards and one custom-quote card, with no price (REQ-065, C8)", () => {
    const packages = main.querySelector('[data-home-section="packages"]') as HTMLElement;
    expect(packages.querySelectorAll('[data-package-card="package"]')).toHaveLength(3);
    expect(packages.querySelectorAll('[data-package-card="custom"]')).toHaveLength(1);
  });

  it("ends with the source final CTA (REQ-063)", () => {
    const cta = main.querySelector('[data-home-section="final-cta"]');
    expect(text(cta?.querySelector("h2") ?? null)).toBe("Ready for more customers?");
    expect(text(cta)).toContain(FINAL_CTA.copy);
  });

  it("keeps a logical heading order: no level is skipped inside the page", () => {
    const levels = [...main.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((l, i) => expect(l - levels[i]).toBeLessThanOrEqual(1));
  });
});

describe("home page calls to action (REQ-051, REQ-063, REQ-175)", () => {
  it("books through the business config: /contact while the booking link is unverified", () => {
    expect(BUSINESS.booking.verified).toBe(false);
    expect(linkByText("Book a Free Consultation")?.getAttribute("href")).toBe("/contact");
    expect(main.querySelector('a[href*="calendly"]')).toBeNull();
  });

  it("sends See Our Work to the proof page, and Get My Free Audit to an existing route", () => {
    expect(linkByText("See Our Work")?.getAttribute("href")).toBe("/realisation");
    // TODO(STS-034): expect "/free-audit" once that route exists.
    expect(linkByText("Get My Free Audit")?.getAttribute("href")).toBe("/contact");
  });

  it("labels every link with text a screen reader can announce", () => {
    for (const a of main.querySelectorAll("a")) {
      expect(a.getAttribute("aria-label") || text(a)).not.toBe("");
    }
  });
});

describe("home page claims (REQ-011, REQ-012, REQ-014, REQ-052, REQ-058, I-12)", () => {
  const body = doc.body.innerHTML;
  const page = text(main);

  it.each(["Enterprise-grade", "Enterprise Technology Solutions", "Digital Transformation", "Transform your business"])(
    "does not contain %s anywhere in the rendered route",
    (phrase) => expect(body).not.toContain(phrase),
  );

  it("does not contain banned or unconfirmed wording in the page content", () => {
    for (const re of [
      /enterprise/i,
      /digital transformation/i,
      /transform your/i,
      /pay for themselves/i,
      /fixed price/i,
      /30-minute/i,
      /no surprises/i,
      /\$\s?\d|\[\$?X\]|\$X/,
      /stars? from/i,
    ]) {
      expect(page).not.toMatch(re);
    }
  });

  it("names no cloud offer in the h1 or h2s", () => {
    for (const h of main.querySelectorAll("h1, h2")) expect(text(h)).not.toMatch(/cloud/i);
  });

  it("shows the configured service area instead of an unconfirmed address or rating", () => {
    expect(page).toContain(BUSINESS.serviceAreaText);
  });

  it("renders no photo at all, so no stock person can read as team or client (REQ-015)", () => {
    expect(main.querySelectorAll("img")).toHaveLength(0);
  });
});
