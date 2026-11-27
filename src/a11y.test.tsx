import { describe, it, expect } from "vitest";
import { render, paths, NOT_FOUND_PATH } from "@/entry-server";
import { MAIN_CONTENT_ID } from "@/components/Header";

// STS-041 (WCAG 2.1 AA, 1.3.1 / 2.4.1 / 2.4.6 / 4.1.2). Every public page is rendered exactly as the
// build prerenders it (entry-server), then read as a document: this is the HTML a screen reader, a
// keyboard user and a no-JS visitor get before any script runs.
const PAGES = [...paths, NOT_FOUND_PATH];
const parse = (url: string) => new DOMParser().parseFromString(render(url), "text/html");
const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

/** Accessible name, close enough for static markup: aria-label, aria-labelledby, alt, visible text. */
function accessibleName(el: Element, doc: Document): string {
  const label = el.getAttribute("aria-label");
  if (label?.trim()) return label.trim();
  const by = el.getAttribute("aria-labelledby");
  if (by) return by.split(/\s+/).map((id) => text(doc.getElementById(id) ?? doc.createElement("i"))).join(" ").trim();
  const id = el.getAttribute("id");
  const forLabel = id ? doc.querySelector(`label[for="${id}"]`) : null;
  if (forLabel && text(forLabel)) return accessibleName(forLabel, doc);
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  const alts = [...clone.querySelectorAll("img[alt]")].map((i) => i.getAttribute("alt")).join(" ");
  return `${text(clone)} ${alts}`.trim();
}

/** Pages whose icons still lack aria-hidden="true", pending a fix in a file this change may not edit. */
const DECORATIVE_SVG_GAPS = new Set<string>(); // /careers icons fixed during integration

const insideAny = (el: Element, selector: string) => el.parentElement?.closest(selector) != null;

describe.each(PAGES)("landmarks, outline and names on %s (STS-041)", (url) => {
  const doc = parse(url);

  it("has one main, one site header and one site footer", () => {
    const mains = doc.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    const banners = [...doc.querySelectorAll("header")].filter((h) => !insideAny(h, "main, article, section, aside, nav"));
    const contentinfo = [...doc.querySelectorAll("footer")].filter((f) => !insideAny(f, "main, article, section, aside, nav"));
    expect(banners).toHaveLength(1);
    expect(contentinfo).toHaveLength(1);
    expect(insideAny(mains[0], "header, footer")).toBe(false);
  });

  it("has a working skip link: first in the page, pointing at a focusable main", () => {
    const first = doc.querySelector("a[href], button");
    expect(first?.getAttribute("href")).toBe(`#${MAIN_CONTENT_ID}`);
    expect(text(first as Element)).toMatch(/skip to main content/i);
    const target = doc.getElementById(MAIN_CONTENT_ID);
    expect(target?.tagName).toBe("MAIN");
    expect(target?.getAttribute("tabindex")).toBe("-1");
  });

  it("names every nav, and no two navs share a name", () => {
    const names = [...doc.querySelectorAll("nav")].map((n) => accessibleName(n, doc));
    expect(names.length).toBeGreaterThanOrEqual(1);
    for (const n of names) expect(n).not.toBe("");
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives no two named regions (section, aside, form) of one role the same name (axe landmark-unique)", () => {
    // A <section> or <form> is a landmark only when it is named; an <aside> always is.
    const named = [...doc.querySelectorAll("section, aside, form")].filter(
      (el) => el.tagName === "ASIDE" || el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby"),
    );
    const keys = named.map((el) => `${el.getAttribute("role") ?? el.tagName.toLowerCase()}|${accessibleName(el, doc)}`);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it("has exactly one h1, inside main", () => {
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].closest("main")).not.toBeNull();
    expect(text(h1s[0])).not.toBe("");
  });

  it("never skips a heading level going down (h2 -> h4), main and footer included", () => {
    const levels = [...doc.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((l, i) => {
      expect(l - levels[i], `heading ${i + 2} (h${l}) after h${levels[i]}`).toBeLessThanOrEqual(1);
    });
  });

  it("gives every link, button and image an accessible name (icon-only controls included)", () => {
    for (const el of doc.querySelectorAll("a[href], button")) {
      if (el.closest('[aria-hidden="true"]')) continue;
      expect(accessibleName(el, doc), el.outerHTML.slice(0, 160)).not.toBe("");
    }
    for (const img of doc.querySelectorAll("img")) expect(img.hasAttribute("alt"), img.outerHTML).toBe(true);
    // Careers.tsx is outside this change's lane (another agent owns it in this sprint); its
    // undecorated lucide icons are listed in the STS-041 hand-back. Every other page is held here.
    if (DECORATIVE_SVG_GAPS.has(url)) return;
    for (const svg of doc.querySelectorAll("svg")) {
      // Decorative icons are hidden; a meaningful one would need a role and a name.
      const hidden = svg.closest('[aria-hidden="true"]') || svg.getAttribute("role") === "img";
      expect(Boolean(hidden), svg.outerHTML.slice(0, 120)).toBe(true);
    }
  });

  it("labels every form control that people can reach", () => {
    for (const el of doc.querySelectorAll("input, select, textarea, [role=combobox]")) {
      if (el.closest('[aria-hidden="true"]') || el.getAttribute("type") === "hidden") continue;
      const id = el.getAttribute("id");
      const labelled =
        (id && doc.querySelector(`label[for="${id}"]`) && text(doc.querySelector(`label[for="${id}"]`) as Element)) ||
        accessibleName(el, doc) ||
        el.closest("label");
      expect(Boolean(labelled), el.outerHTML.slice(0, 160)).toBe(true);
    }
  });

  it("uses each id once (aria-describedby and label targets stay unambiguous)", () => {
    const ids = [...doc.querySelectorAll("[id]")].map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});

describe("home hero calls to action fit a 320 px screen (STS-041)", () => {
  // Measured in Chrome at 320 px before the fix: the nowrap "Book a Free Consultation" button was
  // 333 px wide in a 288 px column, so the whole home page scrolled sideways.
  const hero = parse("/").querySelector('[data-home-section="hero"]') as Element;
  // The two buttons of the hero action row (primary booking CTA and the proof link).
  const ctas = [...hero.querySelectorAll("a")].filter((a) => (a.getAttribute("class") ?? "").includes("font-bold"));

  it("wraps and goes full width below `sm`, keeping a 56 px minimum touch height", () => {
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const a of ctas) {
      const c = (a.getAttribute("class") ?? "").split(/\s+/);
      expect(c).toEqual(expect.arrayContaining(["whitespace-normal", "w-full", "sm:w-auto", "min-h-14"]));
      expect(c).not.toContain("whitespace-nowrap");
      expect(c).not.toContain("h-14");
    }
  });
});

describe("home teaser calls to action fit a 320 px screen (STS-041, found at integration)", () => {
  // Measured in headless Chrome on the integrated build at 320 px: the nowrap "See packages and
  // pricing" button ran from 16 to 349 px, so "/" scrolled sideways (scrollWidth 349). Same fix as the hero.
  const home = parse("/");
  it.each(["packages", "proof"])("the %s teaser button wraps and goes full width below `sm`", (section) => {
    const root = home.querySelector(`[data-home-section="${section}"]`) as Element;
    const ctas = [...root.querySelectorAll("a")].filter((a) => (a.getAttribute("class") ?? "").includes("min-h-14"));
    expect(ctas.length).toBe(1);
    const c = (ctas[0].getAttribute("class") ?? "").split(/\s+/);
    expect(c).toEqual(expect.arrayContaining(["whitespace-normal", "w-full", "sm:w-auto", "min-h-14"]));
    expect(c).not.toContain("h-14");
  });
});
