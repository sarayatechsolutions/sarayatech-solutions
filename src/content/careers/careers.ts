/**
 * Careers copy (FD-01, design audit 2026-11-27, batch B0).
 *
 * The owner has not confirmed any open role, salary or perk (06-OWNER-INPUTS.md C20 and C27 are
 * OPEN), so the page applies the owner's documented fallback: no roles, no salaries, no perks list,
 * one honest sentence and a way to reach us. The page is noindex and out of the sitemap
 * (src/seo/seo.ts). Restore a role list only when C20/C27 close, from owner-supplied content.
 *
 * The old role data in data/careers.json is no longer read by any page; the file is kept.
 */

/** Where the Careers call to action goes: the live contact form (src/routes.tsx). */
export const CAREERS_CONTACT_PATH = "/contact";

export const CAREERS = {
  headline: "Careers at SarayaTech",
  /** Design audit section 5, the Careers fallback sentence (US English). */
  body: "We're not hiring for specific roles right now. If you'd like to work with us, send your CV through the contact form.",
  cta: "Go to the contact form",
} as const;
