import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render } from "@/entry-server";
import { BUSINESS, bookingHref } from "@/config/business";
import { getSeo } from "@/seo/seo";
import { ABOUT_HERO, ABOUT_TEAM, FOUNDER } from "@/content/about/about";
import { FounderSection } from "@/pages/About";
import leadershipTeam from "../../data/leadership-team.json";
import { ABOUT_FORBIDDEN_PHRASES, buildRoutes } from "../../tests/smoke/smoke.mjs";

// STS-036. /about is rendered exactly as the build prerenders it (entry-server), then read as a
// document, so these assertions hold for the HTML a crawler or no-JS visitor gets.
const html = render("/about");
const doc = new DOMParser().parseFromString(html, "text/html");
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const mainText = text(main);
const sections = () => [...main.querySelectorAll("[data-about-section]")].map((s) => s.getAttribute("data-about-section"));

describe("About page content (STS-036, REQ-030)", () => {
  it("has exactly one h1, the source heading", () => {
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe("Your neighbors in tech");
    expect(buildRoutes().find((r) => r.path === "/about")?.expectH1).toBe(ABOUT_HERO.headline);
  });

  it("renders hero, who we serve, values, team and the booking CTA, in that order", () => {
    expect(sections()).toEqual(["hero", "who", "values", "team", "cta"]);
  });

  it("speaks to Columbus small businesses and shows the configured service area", () => {
    expect(mainText).toContain(BUSINESS.serviceAreaText);
    expect(mainText).toContain("Columbus small businesses");
  });

  it("keeps a logical heading order: no level is skipped", () => {
    const levels = [...main.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((l, i) => expect(l - levels[i]).toBeLessThanOrEqual(1));
  });

  it("sends every call to action to bookingHref(), never to Careers", () => {
    const ctas = [...main.querySelectorAll("a")].filter((a) => text(a).startsWith("Book a Free Consultation"));
    expect(ctas.length).toBeGreaterThanOrEqual(1);
    for (const a of ctas) expect(a.getAttribute("href")).toBe(bookingHref());
    expect(main.querySelector('a[href="/careers"]')).toBeNull();
  });

  it("has a meta description that is not the h1", () => {
    expect(getSeo("/about").description).not.toContain(ABOUT_HERO.headline);
  });
});

describe("About page team (REQ-015, C28)", () => {
  const team = main.querySelector('[data-about-section="team"]') as HTMLElement;

  it("shows exactly the people in data/leadership-team.json, with their bios as written", () => {
    expect([...team.querySelectorAll("h3")].map(text)).toEqual(leadershipTeam.map((m) => m.name.trim()));
    for (const m of leadershipTeam) expect(text(team)).toContain(m.bio.trim());
  });

  it("uses only real portraits, each with alt text naming the person, and no stand-in image", () => {
    const imgs = [...main.querySelectorAll("img")];
    for (const img of imgs) {
      expect(img.getAttribute("alt")).toMatch(/^Portrait of \S/);
      expect(img.getAttribute("src")).not.toMatch(/placeholder|team-photo/);
    }
    const withPhoto = leadershipTeam.filter((m) => m.image && !m.image.includes("placeholder"));
    expect(imgs).toHaveLength(withPhoto.length);
    // Members without a portrait get decorative initials, hidden from assistive tech.
    const avatars = team.querySelectorAll("[data-initials-avatar]");
    expect(avatars).toHaveLength(leadershipTeam.length - withPhoto.length);
    avatars.forEach((a) => expect(a.getAttribute("aria-hidden")).toBe("true"));
  });

  it("does not render the stock group photo presented as the team", () => {
    expect(html).not.toContain("team-photo");
    expect(mainText).not.toMatch(/SarayaTech Team/i);
  });
});

describe("About page has no banned copy or unverified claims (REQ-011, REQ-012, REQ-062, REQ-178)", () => {
  it.each(ABOUT_FORBIDDEN_PHRASES)("does not contain %j", (phrase) => {
    expect(html).not.toContain(phrase);
  });

  it("never says enterprise or transform, in any case", () => {
    expect(mainText).not.toMatch(/enterprise/i);
    expect(mainText).not.toMatch(/transform/i);
  });

  it("states no year, client count, percentage or award", () => {
    expect(mainText).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(mainText).not.toMatch(/\d+\s*\+/);
    expect(mainText).not.toMatch(/%/);
    expect(mainText).not.toMatch(/\b(clients served|happy clients|projects delivered|award)/i);
    expect(mainText).not.toMatch(/\bfounded\b|\bsince\b/i);
  });

  it("leaves no placeholder text on the page", () => {
    expect(mainText).not.toMatch(/\[[^\]]*\]|lorem|TODO|placeholder/i);
  });
});

describe("Founder story (C7, REQ-062)", () => {
  it("is not rendered while the owner has not supplied it", () => {
    expect(FOUNDER).toBeNull();
    expect(main.querySelector('[data-about-section="founder"]')).toBeNull();
  });

  it("renders the owner's own words, and nothing else, once supplied", () => {
    const supplied = renderToStaticMarkup(
      <FounderSection
        founder={{ heading: "Why we started", name: "Test Owner", role: "Founder", photo: null, paragraphs: ["Owner words."] }}
      />,
    );
    const founder = new DOMParser().parseFromString(supplied, "text/html");
    expect(text(founder.querySelector("h2"))).toBe("Why we started");
    expect(text(founder.body)).toContain("Owner words.");
    expect(founder.querySelector("img")).toBeNull();
  });
});

describe("Team data helpers", () => {
  it("never passes the stand-in image through as a photo", () => {
    expect(ABOUT_TEAM.members.every((m) => m.photo === null || !m.photo.includes("placeholder"))).toBe(true);
  });
});
