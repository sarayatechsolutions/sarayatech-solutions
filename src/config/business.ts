/**
 * Central business configuration (STS-030).
 *
 * Single source of truth for every business fact the UI may show. Ids (C1, C2, ...) refer to
 * docs/website-remediation/06-OWNER-INPUTS.md section C.
 *
 * RULES
 *  - A value is non-null ONLY when the owner has confirmed it (status SUPPLIED/DONE in 06).
 *    Until then it holds the documented "safe UI fallback": null (hide the slot) or the
 *    fallback text named in 06.
 *  - Consumers must go through the helpers below, never read a raw nullable field and render
 *    it blindly, and never emit an empty `tel:` / `mailto:` or a label with nothing after it.
 *  - Unverified values ({ verified: false }) are NOT public facts: treat them exactly like
 *    null. Use the helper (`bookingHref()`), which returns the fallback.
 *  - To publish a fact: set it here, flip `verified` to true where present, update 06.
 *    No other file should change.
 */

/** C14 shape. `url` is the public Google reviews page for the business profile. */
export interface GoogleReviews {
  rating: number;
  count: number;
  url: string;
}

export const BUSINESS = {
  /** C1: one business name. Fallback per 06. */
  name: "SarayaTech Solutions",

  /**
   * C1: primary domain. Fallback per 06 / B2: apex host.
   * TODO(SEO): the feat/s2-seo-meta branch defines its own SITE_URL in src/seo/. That module
   * will be unified onto this field once both branches are merged.
   */
  siteUrl: "https://sarayatechsolutions.com",

  /**
   * C2: public phone. null = hidden (booking + form only). Display and tel: forms are separate.
   * `tel` must be E.164 ("+16145550100"); any other form is treated as not supplied.
   * `acceptsTexts` is the second half of C2 ("can it receive texts?"): the sms: action renders
   * only when it is exactly `true` (STS-045).
   */
  phone: null as null | { display: string; tel: string; acceptsTexts: boolean },

  /** C3: public email on the main domain. null = contact form only. */
  email: null as null | string,

  /**
   * C4: street address. null = not shown; `serviceAreaText` is shown instead.
   * Never show a street address (or a map pinned to it) until the owner confirms it.
   */
  address: null as null | { lines: readonly string[]; mapEmbedUrl?: string },

  /** C4 fallback copy, shown wherever an address slot would be. */
  serviceAreaText: "Serving Columbus, OH and central Ohio",

  /** C5: service areas actually served. Fallback per 06: Columbus only, no city pages. */
  areas: ["Columbus, OH"],

  /** C6: business hours. null = omitted. */
  hours: null as null | readonly string[],

  /**
   * C15: booking link. OPEN, so `verified: false`: consumers must NOT link to it. Use
   * `bookingHref()` / `hasVerifiedBooking()`, which fall back to the /contact form.
   * The URL is kept here (not deleted) so the owner only has to flip `verified`.
   */
  booking: { url: "https://calendly.com/saraya-info", verified: false },

  /** C19: social profile URLs. null = icons hidden. */
  social: null as null | {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
  },

  /**
   * C14: Google Business Profile reviews, copied from the live profile. null = no rating, no
   * review count and no stars anywhere (REQ-052, REQ-035), and no `aggregateRating` in schema.
   * Setting real values here lights up the sitewide trust slot (GAP-05) with no other change.
   */
  googleReviews: null as null | GoogleReviews,

  /** C17: GA4 measurement ID. null = analytics stays off. */
  ga4Id: null as null | string,
} as const;

export type BusinessConfig = typeof BUSINESS;

/** Where every "contact us / book" call to action goes when nothing better is verified. */
export const CONTACT_PATH = "/contact";

type Cfg = {
  phone: null | { display: string; tel: string; acceptsTexts?: boolean };
  email: null | string;
  address: null | { lines: readonly string[]; mapEmbedUrl?: string };
  hours: null | readonly string[];
  booking: { url: string; verified: boolean };
  social: null | Record<string, string | undefined>;
  googleReviews?: null | GoogleReviews;
};

// Helpers take the config as an optional argument so tests can pass populated values
// without mutating the shared constant.
const cfg = (c?: Cfg): Cfg => c ?? (BUSINESS as unknown as Cfg);

/** E.164: "+", a country code that does not start with 0, then up to 15 digits in total. */
const E164 = /^\+[1-9]\d{6,14}$/;

/** The C2 number in E.164 when one is configured and well formed, otherwise null. */
export const verifiedPhoneE164 = (c?: Cfg): string | null => {
  const tel = cfg(c).phone?.tel?.trim() ?? "";
  return E164.test(tel) ? tel : null;
};

export const hasPhone = (c?: Cfg) => verifiedPhoneE164(c) !== null;
export const phoneHref = (c?: Cfg): string | null => {
  const tel = verifiedPhoneE164(c);
  return tel ? `tel:${tel}` : null;
};

/** True only when there is a valid number AND the owner said it receives texts (C2). */
export const acceptsTexts = (c?: Cfg) => hasPhone(c) && cfg(c).phone?.acceptsTexts === true;
/** sms: link for the C2 number, or null when texts are not confirmed. Never an empty sms:. */
export const smsHref = (c?: Cfg): string | null => (acceptsTexts(c) ? `sms:${verifiedPhoneE164(c)}` : null);

export const hasEmail = (c?: Cfg) => !!cfg(c).email;
export const emailHref = (c?: Cfg): string | null => {
  const e = cfg(c).email;
  return e ? `mailto:${e}` : null;
};

export const hasAddress = (c?: Cfg) => !!cfg(c).address?.lines.length;
export const hasHours = (c?: Cfg) => !!cfg(c).hours?.length;

export const hasVerifiedBooking = (c?: Cfg) => {
  const b = cfg(c).booking;
  return b.verified === true && b.url.length > 0;
};

/** Booking URL when verified, otherwise the /contact form. Always safe to link to. */
export const bookingHref = (c?: Cfg): string => (hasVerifiedBooking(c) ? cfg(c).booking.url : CONTACT_PATH);

/** Primary contact destination: the form. Email is never the fallback. */
export const contactHref = (): string => CONTACT_PATH;

/** Social links that are actually set, as [network, url] pairs. Empty when social is null. */
export const socialLinks = (c?: Cfg): [string, string][] =>
  Object.entries(cfg(c).social ?? {}).filter((e): e is [string, string] => !!e[1]);

/**
 * C14 reviews when they are real and publishable, otherwise null. A rating outside 1-5, a
 * count below 1 or a non-https link is treated as not supplied, so a half-filled config can
 * never render "0 reviews" or an empty star line.
 */
export const verifiedGoogleReviews = (c?: Cfg): GoogleReviews | null => {
  const r = cfg(c).googleReviews;
  if (!r) return null;
  const ok =
    Number.isFinite(r.rating) &&
    r.rating >= 1 &&
    r.rating <= 5 &&
    Number.isInteger(r.count) &&
    r.count >= 1 &&
    r.url.startsWith("https://");
  return ok ? r : null;
};
