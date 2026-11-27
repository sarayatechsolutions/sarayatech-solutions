/**
 * The lead reference line (STS-084, ADR 0003). Shared by the contact and free-audit success
 * messages, so both forms say it the same way.
 *
 * The backend returns `reference` (e.g. "REF-7K3QX9PM") once it has stored the lead; the site
 * shows it only after src/lib/contact-submit.ts has checked it against LEAD_REFERENCE_PATTERN.
 * Rendered as: `${prefix}<code in monospace>${suffix}`.
 *
 * US-English site copy. // OWNER REVIEW: wording.
 */
export const LEAD_REFERENCE_COPY = {
  prefix: "Your reference: ",
  suffix: ". Mention it if you contact us about this request.",
} as const;

/** Design audit B6: the copy button next to the code in the success panel. */
export const LEAD_REFERENCE_COPY_BUTTON = {
  label: "Copy reference",
  copied: "Copied",
  failed: "Couldn't copy",
} as const;
