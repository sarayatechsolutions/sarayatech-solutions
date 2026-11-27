/**
 * Free audit page copy (STS-034, REQ-044). Every user-facing string on /free-audit lives here.
 *
 * Source: docs/source/SarayaTech-Website-Fix-and-Marketing-Plan.md: the offer "Free Website &
 * Google Profile Audit" and the CTA copy "We'll review your website and Google profile and show
 * you three quick wins, whether you hire us or not." Deviations are deliberate:
 *
 *  - No reply time is promised (C16 open, I-12): the success message says we will be in touch.
 *  - No price, count of audits done, result or "30-minute" claim appears (C8, C10, I-12).
 *  - "three quick wins" is the source's own wording and is kept; OWNER REVIEW before launch,
 *    because the owner has not yet confirmed the audit terms (C16).
 *
 * Copy the source does not contain is marked `// OWNER REVIEW`.
 */

export const AUDIT_PATH = "/free-audit";

export const AUDIT_HERO = {
  headline: "Free Website & Google Profile Audit",
  // OWNER REVIEW: built from the source CTA copy; "three quick wins" pending audit terms (C16).
  intro:
    "We'll review your website and Google profile and show you three quick wins, whether you hire us or not.",
} as const;

export const AUDIT_INCLUDES = {
  // OWNER REVIEW: written for STS-034 from the source's audit topics (location, contact path, Google profile).
  heading: "What we look at",
  items: [
    "Your website: can customers read it, trust it and contact you from their phone?",
    "Your Google profile: is it claimed, complete and showing your location?",
    "Your contact path: can a visitor call, email or book in one step?",
  ],
} as const;

export const AUDIT_FORM = {
  // OWNER REVIEW: heading and field labels.
  heading: "Request your free audit",
  requiredNote: "Fields marked with * are required.",
  fields: {
    name: { label: "Your name", autoComplete: "name" },
    company: { label: "Business name", autoComplete: "organization" },
    email: { label: "Email", autoComplete: "email" },
    website: {
      label: "Website address",
      hint: "For example: yourbusiness.com",
      placeholder: "yourbusiness.com",
    },
    phone: { label: "Phone (optional)", autoComplete: "tel" },
    message: { label: "Anything you'd like us to look at? (optional)" },
  },
  // The "How did you hear about us?" select is shared with /contact: src/content/forms/lead-source.ts (STS-054).
  submit: "Get My Free Audit",
  sending: "Sending...",
  errors: {
    name: "Enter your name.",
    company: "Enter your business name.",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address, like name@example.com.",
    websiteRequired: "Enter your website address.",
    websiteInvalid: "Enter a valid website address, like yourbusiness.com.",
    websiteTooLong: "That website address is too long. Enter your homepage, like yourbusiness.com.",
    summary: "Please fix the highlighted fields and try again.",
  },
  // C16 open: no response time. OWNER REVIEW once terms are confirmed.
  success: {
    heading: "Thank you, we have your request.",
    body: "We'll review your website and Google profile and be in touch.",
  },
  failure: "We couldn't send your request right now. Please try again later.",
} as const;
