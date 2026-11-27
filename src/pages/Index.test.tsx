import { describe, it, expect } from "vitest";
import { render } from "@/entry-server";
import { BUSINESS } from "@/config/business";
import { HERO, PROBLEM, FINAL_CTA, HOW_IT_WORKS, SERVICES } from "@/components/home/content";
import { CONSULTATION_CTA_LABEL } from "@/content/cta";

// STS-031. The home route is rendered exactly as the build prerenders it (entry-server), then
// read as a document, so these assertions hold for the HTML a crawler or no-JS visitor gets.
const doc = new DOMParser().parseFromString(render("/"), "text/html");
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
/** What a screen reader announces for a link: aria-label, else its text and image alts, minus aria-hidden parts. */
const accessibleName = (a: Element) => {
  if (a.getAttribute("aria-label")) return a.getAttribute("aria-label") as string;
  const copy = a.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  copy.querySelectorAll("img").forEach((img) => img.replaceWith(img.getAttribute("alt") ?? ""));
  return text(copy);
};
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
    // Design audit B7 (FD-27): the copy describes the primary button, the free audit.
    expect(text(main.querySelector('[data-home-section="final-cta"]'))).toMatch(/Get a free audit\./);
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
    // Design audit B3 / section 5: "Book" promises a calendar, so the unverified label is "Request".
    expect(CONSULTATION_CTA_LABEL).toBe("Request a Free Consultation");
    expect(linkByText(CONSULTATION_CTA_LABEL)?.getAttribute("href")).toBe("/contact");
    expect(main.querySelector('a[href*="calendly"]')).toBeNull();
  });

  it("sends See Our Work to the proof page, and Get My Free Audit to an existing route", () => {
    expect(linkByText("See Our Work")?.getAttribute("href")).toBe("/our-work");
    expect(linkByText("Get My Free Audit")?.getAttribute("href")).toBe("/free-audit");
  });

  // Design audit B4: the hero frames are image links, so the check reads the accessible name
  // (text plus image alt, without aria-hidden parts) instead of the text alone.
  it("labels every link with text a screen reader can announce", () => {
    for (const a of main.querySelectorAll("a")) {
      expect(accessibleName(a)).not.toBe("");
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

  // Design audit B4 (FD-05) deliberately replaced "renders no photo at all": the hero now shows
  // screenshots of shipped work. REQ-015 still holds, because only allow-listed project images
  // render, and never MIMAP (a stock person in its screenshot) or iSaraya (ownership open, C11).
  it("renders only screenshots of our own shipped work, so no stock person reads as team or client (REQ-015)", () => {
    const imgs = [...main.querySelectorAll("img")];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      const src = img.getAttribute("src") ?? "";
      const sets = [img.getAttribute("srcset"), img.closest("picture")?.querySelector("source")?.getAttribute("srcset")];
      const urls = [
        ...(src.startsWith("data:") ? [] : [src]),
        ...sets.filter((v): v is string => !!v).flatMap((v) => v.split(",").map((c) => c.trim().split(/\s+/)[0])),
      ];
      expect(urls.length).toBeGreaterThan(0);
      for (const u of urls) expect(u).toMatch(/^\/images\/(bmv|ASTA)(-800)?\.webp$/);
      expect(img.getAttribute("alt")).toMatch(/^Screen(shot of the|s from the) (ASTA|BMV INSPECTION) /);
      expect(Number(img.getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(img.getAttribute("height"))).toBeGreaterThan(0);
    }
    expect(main.innerHTML).not.toMatch(/mimap\.webp|isaraya/i);
  });
});

describe("home hero project frames (design audit B4, FD-05)", () => {
  const hero = main.querySelector('[data-home-section="hero"]') as HTMLElement;
  const frames = hero.querySelector("[data-hero-frames]") as HTMLElement;

  it("shows the ASTA site and the BMV app, each linking to Our Work with its screenshot as the name", () => {
    const links = [...frames.querySelectorAll("a")];
    expect(links).toHaveLength(2);
    for (const a of links) {
      expect(a.getAttribute("href")).toBe("/our-work");
      // One accessible name: the image's alt, no second label competing with it.
      expect(accessibleName(a)).toBe(a.querySelector("img")?.getAttribute("alt"));
      expect(a.querySelectorAll("img")).toHaveLength(1);
    }
    expect(links.map((a) => a.querySelector("img")?.getAttribute("alt"))).toEqual([
      "Screenshot of the ASTA website, one of our projects",
      "Screens from the BMV INSPECTION booking app, one of our projects",
    ]);
  });

  it("is hidden below lg and downloads nothing there: the screenshots sit in a media-gated <source>", () => {
    expect(frames.className.split(/\s+/)).toEqual(expect.arrayContaining(["hidden", "lg:block"]));
    for (const img of frames.querySelectorAll("img")) {
      expect(img.getAttribute("src")).toMatch(/^data:image\/gif;base64,/);
      expect(img.getAttribute("loading")).toBeNull();
      const source = img.closest("picture")?.querySelector("source");
      expect(source?.getAttribute("media")).toBe("(min-width: 1024px)");
      expect(source?.getAttribute("sizes")).toBeTruthy();
    }
    // The large frame is the likely LCP at lg: it is fetched at high priority.
    expect(frames.querySelector("img")?.getAttribute("fetchpriority")).toBe("high");
  });

  it("animates only under motion-safe, with the second frame 80 ms later (A9)", () => {
    const [site, app] = [...frames.querySelectorAll("a")].map((a) => a.className.split(/\s+/));
    expect(site).toContain("motion-safe:animate-frame-rise");
    expect(app).toEqual(expect.arrayContaining(["motion-safe:animate-frame-rise", "[animation-delay:80ms]"]));
    expect(frames.innerHTML).not.toMatch(/(^|\s)animate-frame-rise/);
  });
});
