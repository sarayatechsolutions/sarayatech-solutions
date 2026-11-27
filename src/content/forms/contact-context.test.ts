import { describe, it, expect } from "vitest";
import { CONTACT_PATH } from "@/config/business";
import { SERVICE_PAGES } from "@/content/services/services";
import { PRICING_CUSTOM, PRICING_PACKAGES } from "@/content/pricing/pricing";
import { SERVICE_INTERESTS } from "@/content/forms/service-interest";
import { CONTACT_CONTEXT_COPY, contactContext, contactHrefFor } from "./contact-context";

// FF-10 (design audit B6): a CTA from a service or a package preselects the matching option, through a
// query parameter read against an allow-list. Anything else is ignored.
describe("contactContext (FF-10)", () => {
  it.each(SERVICE_PAGES)("?service=$slug preselects $navLabel, a value the backend accepts", (page) => {
    const ctx = contactContext(`?service=${page.slug}`);
    expect(ctx).toEqual({ service: page.navLabel });
    expect(SERVICE_INTERESTS).toContain(ctx.service);
  });

  it.each(PRICING_PACKAGES.packages)("?package=$id opens the message with the $name package", (p) => {
    expect(contactContext(`?package=${p.id}`)).toEqual({ message: CONTACT_CONTEXT_COPY.packageMessage(p.name) });
  });

  it("?package=custom-app opens the message and preselects App Development", () => {
    expect(contactContext(`?package=${PRICING_CUSTOM.card.id}`)).toEqual({
      service: "App Development",
      message: CONTACT_CONTEXT_COPY.customMessage,
    });
  });

  it("an explicit service wins over the one a package implies", () => {
    expect(contactContext("?package=custom-app&service=local-seo")).toEqual({
      service: "Local SEO",
      message: CONTACT_CONTEXT_COPY.customMessage,
    });
  });

  // Deny: visitor-controlled input that is not exactly a known value changes nothing.
  it.each([
    "",
    "?",
    "?service=",
    "?service=unknown",
    "?service=Local-SEO",
    "?service=local-seo%20",
    "?service=%20local-seo",
    "?service=Local%20SEO",
    "?service=local-seo&service=paid-ads",
    "?service=local-seo&service=local-seo",
    "?service=__proto__",
    "?service=constructor",
    "?service=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    "?package=",
    "?package=enterprise",
    "?package=Local-Starter",
    "?package=local-starter&package=full-growth",
    "?package=toString",
    "?services=local-seo",
    "?%E0%A4%A=1",
  ])("ignores %j", (search) => {
    expect(contactContext(search)).toEqual({});
  });

  it("never echoes the raw value", () => {
    const evil = '"><img src=x onerror=alert(1)>';
    const ctx = contactContext(`?service=${encodeURIComponent(evil)}&package=${encodeURIComponent(evil)}`);
    expect(JSON.stringify(ctx)).not.toContain("onerror");
    expect(ctx).toEqual({});
  });
});

describe("contactHrefFor (FF-10)", () => {
  it("adds the context to the contact form path", () => {
    expect(contactHrefFor({ service: "local-seo" }, CONTACT_PATH)).toBe("/contact?service=local-seo");
    expect(contactHrefFor({ package: "local-growth" }, CONTACT_PATH)).toBe("/contact?package=local-growth");
  });

  it("leaves a verified booking URL untouched", () => {
    const booking = "https://calendar.example.com/book/consultation";
    expect(contactHrefFor({ service: "local-seo" }, booking)).toBe(booking);
    expect(contactHrefFor({ package: "full-growth" }, booking)).toBe(booking);
  });

  it("round-trips: every link it builds is read back to a context", () => {
    for (const p of SERVICE_PAGES) {
      const href = contactHrefFor({ service: p.slug }, CONTACT_PATH);
      expect(contactContext(href.slice(href.indexOf("?")))).toEqual({ service: p.navLabel });
    }
    for (const p of [...PRICING_PACKAGES.packages, PRICING_CUSTOM.card]) {
      const href = contactHrefFor({ package: p.id }, CONTACT_PATH);
      expect(contactContext(href.slice(href.indexOf("?"))).message).toBeTruthy();
    }
  });
});
