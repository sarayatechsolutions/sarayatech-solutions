import { describe, it, expect } from "vitest";
import { render, paths, NOT_FOUND_PATH } from "@/entry-server";
import { bookingHref } from "@/config/business";
import { FREE_AUDIT_PATH } from "@/components/home/content";
import { CTA_IDS } from "@/lib/analytics";

// STS-050: the primary booking / consultation CTAs carry a fixed `data-track-cta` id, the hook the
// cta_click event reads. An inert attribute: it does nothing without a GA4 id and consent.
const parse = (url: string) => new DOMParser().parseFromString(render(url), "text/html");
const tagged = (doc: Document) =>
  [...doc.querySelectorAll("[data-track-cta]")].map((el) => [el.getAttribute("data-track-cta"), el.getAttribute("href")]);

describe("tracked CTAs (cta_click)", () => {
  it("the home page tags the header CTA, the hero consultation and both closing actions", () => {
    const ids = tagged(parse("/")).map(([id]) => id);
    expect(ids).toEqual(expect.arrayContaining(["header_cta", "hero_consultation", "final_consultation", "final_audit"]));
  });

  it.each([...paths, NOT_FOUND_PATH])("%s: every id is from the fixed list and matches its destination", (url) => {
    const list = tagged(parse(url));
    expect(list.filter(([id]) => id === "header_cta")).toHaveLength(1);
    for (const [id, href] of list) {
      expect(CTA_IDS).toContain(id);
      if (id === "final_audit") expect(href).toBe(FREE_AUDIT_PATH);
      if (id === "final_consultation" || id === "hero_consultation") expect(href).toBe(bookingHref());
    }
  });

  it("pages that swap the closing actions (About puts the consultation first) keep the ids on the right link", () => {
    const list = tagged(parse("/about"));
    expect(list).toEqual(expect.arrayContaining([["final_consultation", bookingHref()], ["final_audit", FREE_AUDIT_PATH]]));
  });
});
