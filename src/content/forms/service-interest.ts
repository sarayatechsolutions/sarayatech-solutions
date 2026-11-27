/**
 * "Service Interest" on the Contact form (STS-052 F2). The one list the select offers.
 *
 * The values are a wire contract: the backend accepts exactly these, case-sensitive
 * (BE lib/validation.ts SERVICE_OPTIONS), plus absent / empty. Anything else is a 400
 * `validation_failed`. Change the list on both sides together, never on one.
 *
 * The five service values are derived from SERVICE_PAGES (their navLabel), so a renamed or
 * added service page changes this list; service-interest.test.ts pins the exact literal list
 * so that drift is visible and forces the backend list to be updated in the same change.
 */
import { SERVICE_PAGES } from "@/content/services/services";

/** For visitors who do not know which service fits (also the form's default). */
export const SERVICE_INTEREST_UNSURE = "Not sure yet / Something else";

export const SERVICE_INTERESTS: readonly string[] = Object.freeze([
  ...SERVICE_PAGES.map((p) => p.navLabel),
  SERVICE_INTEREST_UNSURE,
]);
