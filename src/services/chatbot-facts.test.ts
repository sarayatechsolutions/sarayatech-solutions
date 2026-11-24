import { describe, it, expect } from "vitest";
import { BUSINESS } from "@/config/business";
import {
  bookingCta,
  bookingReply,
  contactReply,
  locationLine,
  locationReply,
  reachUsBlock,
  type BusinessFacts,
} from "./chatbot-facts";
import { POPULATED, SERVICE_AREA, expectNoStaleFacts } from "./chatbot-facts.fixtures";

describe("chatbot facts with the shipped config (all OPEN in 06)", () => {
  it("the shipped config really is the fallback (guards this suite's premise)", () => {
    expect(BUSINESS.serviceAreaText).toBe(SERVICE_AREA);
    expect(BUSINESS.email).toBeNull();
    expect(BUSINESS.phone).toBeNull();
    expect(BUSINESS.address).toBeNull();
    expect(BUSINESS.booking.verified).toBe(false);
  });

  it("location answer states the service area and points to the contact form", () => {
    const reply = locationReply();
    expect(reply).toContain(SERVICE_AREA);
    expect(reply).toContain("[contact form](/contact)");
    expect(locationLine()).toBe(SERVICE_AREA);
    expectNoStaleFacts(reply);
  });

  it("contact answer sends the visitor to the contact form with no email, phone, address or socials", () => {
    const reply = contactReply();
    expect(reply).toContain("[contact form](/contact)");
    expect(reply).toContain(SERVICE_AREA);
    expect(reply).not.toMatch(/Email|Phone|Address|Follow us|Book a meeting/);
    expectNoStaleFacts(reply);
  });

  it("booking answer uses the contact form because the booking link is unverified", () => {
    const reply = bookingReply();
    expect(reply).toContain("[contact form](/contact)");
    expect(bookingCta()).toContain("[contact form](/contact)");
    expectNoStaleFacts(reply);
    expectNoStaleFacts(bookingCta());
  });

  it("the default-answer facts block shows only the service area", () => {
    expect(reachUsBlock()).toBe(`📍 **Service area:** ${SERVICE_AREA}`);
  });
});

describe("chatbot facts with a populated config passed in", () => {
  it("contact answer lists exactly the confirmed values", () => {
    const reply = contactReply(POPULATED);
    expect(reply).toContain("📧 **Email:** hello@example.test");
    expect(reply).toContain("📞 **Phone:** (555) 010-0199");
    expect(reply).toContain("📍 **Address:** 1 Example Way, Columbus, OH 00000");
    expect(reply).toContain("📅 **Book a meeting:** https://booking.example.test/saraya");
    expect(reply).toContain("LinkedIn: https://social.example.test/saraya");
    expect(reply).not.toMatch(/Twitter/); // an unset network is not mentioned
    expect(reply).not.toContain(SERVICE_AREA);
  });

  it("location answer gives the confirmed address", () => {
    expect(locationReply(POPULATED)).toContain("1 Example Way, Columbus, OH 00000");
  });

  it("booking answer links the verified booking URL", () => {
    expect(bookingReply(POPULATED)).toContain("https://booking.example.test/saraya");
    expect(bookingCta(POPULATED)).toContain("https://booking.example.test/saraya");
  });

  it("an UNVERIFIED booking URL is never shown, even when set", () => {
    const unverified: BusinessFacts = { ...POPULATED, booking: { url: "https://calendly.com/x", verified: false } };
    for (const reply of [bookingReply(unverified), bookingCta(unverified), contactReply(unverified)]) {
      expect(reply).not.toMatch(/calendly/i);
    }
    expect(bookingReply(unverified)).toContain("[contact form](/contact)");
  });
});
