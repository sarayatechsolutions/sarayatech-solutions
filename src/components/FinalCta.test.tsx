import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import FinalCta, { TrustSlot } from "@/components/FinalCta";
import { BUSINESS, bookingHref, verifiedGoogleReviews } from "@/config/business";
import { FREE_AUDIT_PATH, PROOF_PATH } from "@/components/home/content";
import { TRUST, launchedProjectNames, proofItems } from "@/content/trust/trust";

// STS-046 (GAP-05): the sitewide closing block shows verified proof only.

const BASE = {
  phone: null,
  email: null,
  address: null,
  hours: null,
  booking: { url: "https://example.com/book", verified: false },
  social: null,
};
const REVIEWS = { rating: 4.9, count: 37, url: "https://g.page/r/example/review" };

const toDoc = (ui: ReactElement, path = "/") =>
  new DOMParser().parseFromString(
    renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>),
    "text/html",
  );
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const linkByText = (doc: Document, label: string) => [...doc.querySelectorAll("a")].find((a) => text(a) === label);

describe("trust slot with no verified proof beyond the defaults (C14 open)", () => {
  const doc = toDoc(<FinalCta id="t" />);
  const slot = doc.querySelector("[data-trust-slot]");

  it("C14 is still null, so the default config publishes no rating", () => {
    expect(BUSINESS.googleReviews).toBeNull();
    expect(verifiedGoogleReviews()).toBeNull();
  });

  it("renders the verified facts only: service area, launched work, one team", () => {
    const ids = [...doc.querySelectorAll("[data-proof-item]")].map((li) => li.getAttribute("data-proof-item"));
    expect(ids).toEqual(["service-area", "launched-work", "one-team"]);
    expect(text(slot)).toContain(BUSINESS.serviceAreaText);
    for (const name of launchedProjectNames()) expect(text(slot)).toContain(name);
  });

  it("leaves no empty proof markup: no stars, rating, review count or digits", () => {
    expect(doc.querySelector('[data-proof-item="google-reviews"]')).toBeNull();
    expect(text(slot)).not.toMatch(/\d/);
    expect(text(slot)).not.toMatch(/stars?|reviews?|rating|★|\(0\)/i);
    for (const li of doc.querySelectorAll("[data-proof-item]")) expect(text(li).length).toBeGreaterThan(0);
  });

  it("does not use claims the config does not verify", () => {
    const all = text(doc.body);
    expect(all).not.toMatch(/years|since \d|Fortune|guarantee|certified|24 hours|business days|clients|trusted by/i);
  });

  it("only links internal pages (no review link while C14 is open)", () => {
    expect(doc.querySelector('a[href^="http"]')).toBeNull();
    expect(linkByText(doc, TRUST.workLink)?.getAttribute("href")).toBe(PROOF_PATH);
  });
});

describe("trust slot lights up when the owner fills C14", () => {
  const items = proofItems({ ...BASE, googleReviews: REVIEWS });
  const doc = toDoc(<FinalCta id="t" items={items} />);

  it("shows the supplied rating and count first, with a safe external link", () => {
    const li = doc.querySelector('[data-proof-item="google-reviews"]');
    expect(doc.querySelector("[data-proof-item]")).toBe(li);
    expect(text(li)).toContain("4.9 stars from 37 Google reviews");
    const a = li?.querySelector("a");
    expect(a?.getAttribute("href")).toBe(REVIEWS.url);
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toContain("noopener");
    expect(a?.getAttribute("aria-label")).toBe(`${TRUST.reviewsLink} ${TRUST.newTab}`);
  });

  it("treats a half-filled or impossible value as not supplied", () => {
    for (const bad of [
      { ...REVIEWS, count: 0 },
      { ...REVIEWS, rating: 0 },
      { ...REVIEWS, rating: 5.5 },
      { ...REVIEWS, count: 2.5 },
      { ...REVIEWS, url: "http://insecure.example" },
    ]) {
      expect(verifiedGoogleReviews({ ...BASE, googleReviews: bad })).toBeNull();
      expect(proofItems({ ...BASE, googleReviews: bad }).map((i) => i.id)).not.toContain("google-reviews");
    }
  });

  it("uses the singular for one review", () => {
    const one = proofItems({ ...BASE, googleReviews: { ...REVIEWS, rating: 5, count: 1 } });
    expect(one[0].text).toBe("5.0 stars from 1 Google review");
  });
});

describe("final CTA actions", () => {
  it("defaults to the free audit (REQ-063) and a consultation through bookingHref()", () => {
    const doc = toDoc(<FinalCta id="t" />);
    expect(linkByText(doc, "Get My Free Audit")?.getAttribute("href")).toBe(FREE_AUDIT_PATH);
    expect(linkByText(doc, "Book a Free Consultation")?.getAttribute("href")).toBe(bookingHref());
    expect(doc.querySelector('a[href*="calendly"]')).toBeNull();
  });

  it("is a labelled region with one h2 and no h1", () => {
    const doc = toDoc(<FinalCta id="t" heading="Ready?" />);
    const section = doc.querySelector("section");
    const h2 = doc.getElementById(section?.getAttribute("aria-labelledby") ?? "");
    expect(h2?.tagName).toBe("H2");
    expect(text(h2)).toBe("Ready?");
    expect(doc.querySelectorAll("h1")).toHaveLength(0);
    expect(doc.querySelectorAll("h2")).toHaveLength(1);
    expect(doc.querySelector("[data-trust-slot] h3")).not.toBeNull();
  });

  it("drops the Our Work link on the Our Work page but keeps the fact", () => {
    const doc = toDoc(<FinalCta id="t" />, PROOF_PATH);
    expect(linkByText(doc, TRUST.workLink)).toBeUndefined();
    expect(doc.querySelector('[data-proof-item="launched-work"]')).not.toBeNull();
  });
});

describe("standalone trust slot", () => {
  it("is its own labelled region with an h2 and no call to action", () => {
    const doc = toDoc(<TrustSlot id="c" standalone />);
    const section = doc.querySelector('section[data-final-cta="trust-only"]');
    expect(doc.getElementById(section?.getAttribute("aria-labelledby") ?? "")?.tagName).toBe("H2");
    expect(linkByText(doc, "Get My Free Audit")).toBeUndefined();
    expect(linkByText(doc, "Book a Free Consultation")).toBeUndefined();
  });

  it("renders nothing at all when there is no proof to show", () => {
    expect(renderToStaticMarkup(<MemoryRouter><TrustSlot id="c" standalone items={[]} /></MemoryRouter>)).toBe("");
  });
});
