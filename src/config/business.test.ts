import { describe, it, expect } from "vitest";
import {
  BUSINESS,
  CONTACT_PATH,
  bookingHref,
  contactHref,
  emailHref,
  hasAddress,
  hasEmail,
  hasHours,
  hasPhone,
  hasVerifiedBooking,
  phoneHref,
  socialLinks,
} from "./business";

const FILLED = {
  phone: { display: "+1 (555) 000-0000", tel: "+15550000000" },
  email: "hello@example.com",
  address: { lines: ["1 Main St", "Columbus, OH"] },
  hours: ["Mon-Fri 9-5"],
  booking: { url: "https://example.com/book", verified: true },
  social: { linkedin: "https://linkedin.com/company/x", twitter: undefined },
};

describe("business config defaults (06-OWNER-INPUTS: nothing supplied yet)", () => {
  it("holds only the documented fallbacks", () => {
    expect(BUSINESS.name).toBe("SarayaTech Solutions");
    expect(BUSINESS.phone).toBeNull();
    expect(BUSINESS.email).toBeNull();
    expect(BUSINESS.address).toBeNull();
    expect(BUSINESS.hours).toBeNull();
    expect(BUSINESS.social).toBeNull();
    expect(BUSINESS.ga4Id).toBeNull();
    expect(BUSINESS.areas).toEqual(["Columbus, OH"]);
    expect(BUSINESS.serviceAreaText).toBe("Serving Columbus, OH and central Ohio");
    expect(BUSINESS.booking.verified).toBe(false);
  });

  it("helpers return the safe fallback", () => {
    expect(hasPhone()).toBe(false);
    expect(phoneHref()).toBeNull();
    expect(hasEmail()).toBe(false);
    expect(emailHref()).toBeNull();
    expect(hasAddress()).toBe(false);
    expect(hasHours()).toBe(false);
    expect(socialLinks()).toEqual([]);
    expect(contactHref()).toBe(CONTACT_PATH);
  });

  it("an unverified booking link falls back to the contact form", () => {
    expect(hasVerifiedBooking()).toBe(false);
    expect(bookingHref()).toBe("/contact");
  });
});

describe("helpers with supplied values", () => {
  it("builds tel:, mailto: and the verified booking URL", () => {
    expect(hasPhone(FILLED)).toBe(true);
    expect(phoneHref(FILLED)).toBe("tel:+15550000000");
    expect(emailHref(FILLED)).toBe("mailto:hello@example.com");
    expect(hasAddress(FILLED)).toBe(true);
    expect(hasHours(FILLED)).toBe(true);
    expect(bookingHref(FILLED)).toBe("https://example.com/book");
    expect(socialLinks(FILLED)).toEqual([["linkedin", "https://linkedin.com/company/x"]]);
  });

  it("treats empty values as absent, never an empty tel:/mailto:", () => {
    const empty = {
      ...FILLED,
      phone: { display: "", tel: "" },
      email: "",
      address: { lines: [] },
      hours: [],
      booking: { url: "https://example.com/book", verified: false },
    };
    expect(phoneHref(empty)).toBeNull();
    expect(emailHref(empty)).toBeNull();
    expect(hasAddress(empty)).toBe(false);
    expect(hasHours(empty)).toBe(false);
    expect(bookingHref(empty)).toBe("/contact");
  });
});
