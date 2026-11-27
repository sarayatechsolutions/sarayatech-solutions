import { hasVerifiedBooking } from "@/config/business";

/**
 * The consultation call to action, one string for the whole site (design audit 2026-11-27, FD-27
 * and section 5).
 *
 * "Book" promises a calendar. While the booking link is unverified, `bookingHref()` falls back to
 * the /contact form, so the button says "Request" instead. Once the owner verifies a booking URL in
 * src/config/business.ts, every label flips back to "Book" with no other change.
 */
export const CONSULTATION_CTA = {
  book: "Book a Free Consultation",
  request: "Request a Free Consultation",
} as const;

type BookingConfig = Parameters<typeof hasVerifiedBooking>[0];

/** The label for a given config (tests pass one); the live site uses CONSULTATION_CTA_LABEL. */
export const consultationCtaLabel = (c?: BookingConfig): string =>
  hasVerifiedBooking(c) ? CONSULTATION_CTA.book : CONSULTATION_CTA.request;

/** The label for the shipped config. */
export const CONSULTATION_CTA_LABEL = consultationCtaLabel();
