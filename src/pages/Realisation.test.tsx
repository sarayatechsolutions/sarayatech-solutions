import { describe, it, expect } from "vitest";
import { render } from "@/entry-server";
import { bookingHref } from "@/config/business";
import { getSeo } from "@/seo/seo";
import { PROJECT_COPY, WORK_HERO } from "@/content/work/work";
import { workProjects } from "@/pages/Realisation";
import realisations from "../../data/realisations.json";
import { WORK_FORBIDDEN_PHRASES, buildRoutes } from "../../tests/smoke/smoke.mjs";
import { CONSULTATION_CTA_LABEL } from "@/content/cta";

// STS-035. /our-work (STS-057; formerly /realisation) is rendered exactly as the build prerenders it (entry-server), then read
// as a document, so these assertions hold for the HTML a crawler or no-JS visitor gets.
const html = render("/our-work");
const doc = new DOMParser().parseFromString(html, "text/html");
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const mainText = text(main);
const projects = [...main.querySelectorAll("[data-work-project]")] as HTMLElement[];

describe("Our Work page (STS-035, REQ-007, REQ-028)", () => {
  it("has exactly one h1, and the smoke table expects the same", () => {
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe("Our Work");
    expect(buildRoutes().find((r) => r.path === "/our-work")?.expectH1).toBe(WORK_HERO.headline);
  });

  it("shows exactly the four verified projects, in the data's order", () => {
    expect(projects).toHaveLength(4);
    expect(projects.map((p) => p.getAttribute("data-work-project"))).toEqual(["BMV INSPECTION", "iSaraya", "MIMAP", "ASTA"]);
    expect(projects.map((p) => text(p.querySelector("h2")))).toEqual(["BMV INSPECTION", "iSaraya", "MIMAP", "ASTA"]);
  });

  it("gives each project what it is and what we built, and nothing else", () => {
    for (const p of projects) {
      expect([...p.querySelectorAll("h3")].map(text)).toEqual(["What it is", "What we built"]);
    }
  });

  it("only shows active projects that exist in data/realisations.json", () => {
    const active = realisations.filter((r) => r.isActive).map((r) => r.company);
    expect(workProjects().map((p) => p.company)).toEqual(active);
    for (const c of PROJECT_COPY) expect(active).toContain(c.company);
    expect(mainText).not.toContain("Saraya Auto Rental");
    expect(mainText).not.toContain("SarayaTech Senegal");
  });

  it("sends the call to action to bookingHref()", () => {
    const ctas = [...main.querySelectorAll("a")].filter((a) => text(a) === CONSULTATION_CTA_LABEL);
    expect(ctas).toHaveLength(1);
    expect(ctas[0].getAttribute("href")).toBe(bookingHref());
  });

  it("has a title within 60 characters and a description that is not the h1", () => {
    const seo = getSeo("/our-work");
    expect(seo.title.length).toBeLessThanOrEqual(60);
    expect(seo.description.length).toBeLessThanOrEqual(155);
    expect(seo.title).not.toBe(WORK_HERO.headline);
    expect(seo.description).not.toBe(WORK_HERO.headline);
  });
});

describe("Our Work images and links", () => {
  it("gives every screenshot descriptive alt text, and shows no placeholder or stock image", () => {
    const imgs = [...main.querySelectorAll("img")];
    expect(imgs).toHaveLength(4);
    for (const img of imgs) {
      expect(img.getAttribute("alt")).toMatch(/^Screenshot of the .+ website home page/);
      expect(img.getAttribute("src")).not.toMatch(/placeholder|team-photo|unsplash/i);
    }
    expect(imgs.map((i) => i.getAttribute("alt"))).toContain("Screenshot of the MIMAP website home page (in French)");
  });

  it("links out only to the real project URLs, each with rel=noopener noreferrer", () => {
    const external = [...main.querySelectorAll("a")].filter((a) => /^https?:/.test(a.getAttribute("href") ?? ""));
    const expected = realisations.filter((r) => r.isActive && r.link).map((r) => r.link);
    expect(external.map((a) => a.getAttribute("href"))).toEqual(expected);
    expect(external).toHaveLength(4);
    for (const a of external) {
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
      expect(a.getAttribute("target")).toBe("_blank");
    }
  });
});

describe("Our Work has no banned copy or unverified claims (REQ-011, REQ-012, REQ-172, C10)", () => {
  it.each(WORK_FORBIDDEN_PHRASES.filter((p) => p !== "%"))("does not contain %j", (phrase) => {
    expect(html).not.toContain(phrase);
  });

  it("never says enterprise or transform, in any case", () => {
    expect(mainText).not.toMatch(/enterprise/i);
    expect(mainText).not.toMatch(/transform/i);
  });

  it("states no percentage, count, year, result or testimonial", () => {
    expect(mainText).not.toMatch(/%/);
    expect(mainText).not.toMatch(/\b\d+\s*\+/);
    expect(mainText).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(mainText).not.toMatch(/\b(results?|clients? served|happy clients|projects delivered|award|testimonial|increase[ds]?|boost(ed)?|grew|growth|faster|roi)\b/i);
    expect(main.querySelector("blockquote")).toBeNull();
  });

  it("does not claim a project was for a client (C10, C11 are open)", () => {
    expect(mainText).not.toMatch(/\b(our clients?|client:|for our client)\b/i);
  });

  it("leaves no placeholder text", () => {
    expect(mainText).not.toMatch(/\[[^\]]*\]|lorem|TODO|placeholder/i);
  });
});

describe("Our Work LCP image (FF-12)", () => {
  it("fetches the first screenshot eagerly at high priority and keeps the rest lazy", () => {
    const imgs = projects.map((p) => p.querySelector("img") as HTMLImageElement);
    expect(imgs.length).toBeGreaterThan(1);
    const [first, ...rest] = imgs;
    expect(first.getAttribute("loading")).toBe("eager");
    expect(first.getAttribute("fetchpriority")).toBe("high");
    for (const img of rest) {
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.getAttribute("fetchpriority")).toBeNull();
    }
  });
});
