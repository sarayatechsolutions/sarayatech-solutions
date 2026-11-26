/**
 * "How did you hear about us?" (STS-054, GAP-09). The one list both lead forms offer.
 *
 * The values are a wire contract: the backend accepts exactly these five, case-sensitive
 * (BE lib/validation.ts SOURCE_OPTIONS), plus absent / empty / null. Anything else is a 400
 * `validation_failed` with LEAD_SOURCE_INVALID as its message. Change the list on both sides
 * together, never on one.
 *
 * The labels are US-English site copy. // OWNER REVIEW: labels and hint wording.
 */

export const LEAD_SOURCES = ["google", "referral", "social", "ads", "other"] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

/** A Record, so the type checker refuses a value without a label or a label without a value. */
const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  google: "Google search",
  referral: "A referral",
  social: "Social media",
  ads: "An ad",
  other: "Other",
};

/** In display order, which is LEAD_SOURCES order. */
export const LEAD_SOURCE_OPTIONS: ReadonlyArray<{ value: LeadSource; label: string }> = LEAD_SOURCES.map(
  (value) => ({ value, label: LEAD_SOURCE_LABELS[value] }),
);

export const LEAD_SOURCE_FIELD = {
  label: "How did you hear about us? (optional)",
  emptyOption: "Choose one (optional)",
  hint: "This helps us learn how people find us.",
} as const;

/** The backend's own message for a value outside the list, shown verbatim if the client catches it first. */
export const LEAD_SOURCE_INVALID = "Please choose how you heard about us from the list.";

export function isLeadSource(value: unknown): value is LeadSource {
  return typeof value === "string" && (LEAD_SOURCES as readonly string[]).includes(value);
}

/**
 * The payload fragment for the select: nothing when no choice was made, otherwise the
 * value as chosen. It is NOT trusted here: the lead submitter (src/lib/contact-submit.ts)
 * checks it with isLeadSource before anything leaves the browser.
 */
export function chosenLeadSource(raw: string | null | undefined): { source?: LeadSource } {
  return raw ? { source: raw as LeadSource } : {};
}
