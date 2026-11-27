import { describe, it, expect } from "vitest";
import { render } from "@/entry-server";
import { getPublicPaths } from "@/routes";
import { bookingHref } from "@/config/business";
import { FREE_AUDIT_PATH } from "@/components/home/content";
import { NO_CLOSING_BLOCK_PATHS, TRUST_ONLY_PATHS } from "@/content/trust/trust";
import { NO_CLOSING_ROUTES, TRUST_ONLY_ROUTES, buildRoutes, closingBlockFor } from "../../tests/smoke/smoke.mjs";
import { CONSULTATION_CTA_LABEL } from "@/content/cta";

// STS-046 (GAP-05): every public page, rendered exactly as the build prerenders it, ends with
// ONE closing block. Deliberate exceptions get the trust slot without a second CTA:
//   /contact and /free-audit (they are the conversion step), /careers (keeps its job-seeker CTA).
// Design audit B7: the legal drafts (/privacy, /terms) end with the document and carry no block.
const parse = (path: string) => new DOMParser().parseFromString(render(path), "text/html");
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const paths = getPublicPaths();

describe("sitewide closing block (STS-046)", () => {
  it("keeps the trust-only list in step with the smoke test and the routed pages", () => {
    expect([...TRUST_ONLY_PATHS]).toEqual(TRUST_ONLY_ROUTES);
    for (const p of TRUST_ONLY_PATHS) expect(paths).toContain(p);
    expect([...NO_CLOSING_BLOCK_PATHS]).toEqual(NO_CLOSING_ROUTES);
    for (const p of NO_CLOSING_BLOCK_PATHS) expect(paths).toContain(p);
    for (const r of buildRoutes().filter((r) => paths.includes(r.path))) {
      expect(r.closingBlock, r.path).toBe(closingBlockFor(r.path));
    }
  });

  it.each(NO_CLOSING_BLOCK_PATHS)("%s ends with the document, no closing block, no sales CTA (B7)", (path) => {
    const doc = parse(path);
    expect(doc.querySelectorAll("[data-final-cta]")).toHaveLength(0);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    const main = doc.querySelector("main") as HTMLElement;
    expect(text(main)).not.toContain("Get My Free Audit");
    expect(text(main)).not.toContain(CONSULTATION_CTA_LABEL);
  });

  it.each(paths.filter((p) => closingBlockFor(p) !== "none"))("%s ends with exactly one closing block and keeps one h1", (path) => {
    const doc = parse(path);
    const main = doc.querySelector("main") as HTMLElement;
    const blocks = main.querySelectorAll("[data-final-cta]");
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block.getAttribute("data-final-cta")).toBe(closingBlockFor(path));

    // It is the last section of the page: nothing but the footer follows it.
    const sections = [...main.querySelectorAll("section")];
    expect(sections[sections.length - 1]).toBe(block);

    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(block.querySelector("h1")).toBeNull();

    const slot = block.querySelector("[data-trust-slot]");
    expect(slot).not.toBeNull();
    // C14 is open: no rating, review count or star anywhere in the block.
    // ("We'll review your website" is a verb in the CTA copy, so only the plural/Google noun counts.)
    expect(text(block)).not.toMatch(/\bstars?\b|\breviews\b|Google reviews?\b|\brating\b|★|\(0\)/i);
    expect(text(slot)).not.toMatch(/\d/);

    // FF-10 (design audit B6): a service page's consultation link carries `?service=<slug>`, so hrefs
    // are compared without their query.
    const hrefs = [...block.querySelectorAll("a")].map((a) => (a.getAttribute("href") ?? "").split(/[?#]/)[0]);
    if (closingBlockFor(path) === "full") {
      expect(hrefs).toContain(FREE_AUDIT_PATH);
      expect(hrefs).toContain(bookingHref());
      // Design audit B7 (FD-27): one offer per block. The sentence under the heading sells the
      // primary button's offer and never the secondary's ("...or ask for a free audit first").
      const copy = text(block.querySelector("h2 + p"));
      const primary = text(block.querySelector("a"));
      expect(copy.length).toBeGreaterThan(0);
      const secondaryOffer = /audit/i.test(primary) ? /\bconsultation\b/i : /\baudit\b/i;
      expect(copy).not.toMatch(secondaryOffer);
    } else {
      expect(text(block)).not.toContain("Get My Free Audit");
      expect(text(block)).not.toContain(CONSULTATION_CTA_LABEL);
    }
  });
});
