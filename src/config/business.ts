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

export const BUSINESS = {
  /** C1: one business name. Fallback per 06. */
  name: "SarayaTech Solutions",

  /**
   * C1: primary domain. Fallback per 06 / B2: apex host.
   * TODO(SEO): the feat/s2-seo-meta branch defines its own SITE_URL in src/seo/. That module
   * will be unified onto this field once both branches are merged.
   */
  siteUrl: "https://sarayatechsolutions.com",

  /** C2: public phone. null = hidden (booking + form only). Display and tel: forms are separate. */
  phone: null as null | { display: string; tel: string },

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

  /** C17: GA4 measurement ID. null = analytics stays off. */
  ga4Id: null as null | string,
} as const;

export type BusinessConfig = typeof BUSINESS;

/** Where every "contact us / book" call to action goes when nothing better is verified. */
export const CONTACT_PATH = "/contact";

type Cfg = {
  phone: null | { display: string; tel: string };
  email: null | string;
  address: null | { lines: readonly string[]; mapEmbedUrl?: string };
  hours: null | readonly string[];
  booking: { url: string; verified: boolean };
  social: null | Record<string, string | undefined>;
};

// Helpers take the config as an optional argument so tests can pass populated values
// without mutating the shared constant.
const cfg = (c?: Cfg): Cfg => c ?? (BUSINESS as unknown as Cfg);

export const hasPhone = (c?: Cfg) => !!cfg(c).phone?.tel;
export const phoneHref = (c?: Cfg): string | null => {
  const p = cfg(c).phone;
  return p?.tel ? `tel:${p.tel}` : null;
};

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
