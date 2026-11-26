/**
 * Analytics consent banner copy (STS-050). US English. Shown only when a GA4 id is configured
 * and the visitor has not chosen yet; see src/components/ConsentBanner.tsx.
 *
 * Every sentence must stay true to src/lib/analytics.ts and to the "Cookies, analytics and
 * tracking" section of src/content/legal/privacy.ts. // OWNER REVIEW: wording.
 */
export const CONSENT_BANNER = {
  /** Accessible name of the region (also its visible heading). */
  heading: "Analytics cookies",
  body: "May we use Google Analytics cookies to count visits and see which pages help people? They stay off unless you accept. No ads, and we never send your name, email, phone number or messages.",
  linkText: "Privacy Policy",
  accept: "Accept",
  decline: "Decline",
  /** STS-071: footer button that shows this banner again, so a visitor can change or withdraw a choice. */
  settingsLink: "Cookie settings",
} as const;
