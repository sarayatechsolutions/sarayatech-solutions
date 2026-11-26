/**
 * Sitewide closing block (STS-046, GAP-05, REQ-035, REQ-063): the trust slot and the final call
 * to action every public page ends with. Every user-facing string of the block lives here.
 *
 * VERIFIED PROOF ONLY. A proof item is built from a fact that is already verified:
 *  - the service area (`BUSINESS.serviceAreaText`, the C4/C5 fallback the owner approved),
 *  - the launched projects shown on the home page (`PROOF.projects`, read from
 *    data/realisations.json, live entries only; iSaraya waits for C11),
 *  - the Google rating and review count (C14), ONLY when `verifiedGoogleReviews()` returns real
 *    values. It is null today, so no star, rating or count is rendered.
 * No testimonial (C12), client logo (C13), years in business (C7), guarantee, certification or
 * response-time promise is used: none of them is verified in src/config/business.ts.
 *
 * The site is English only (C24); this module is the one place a translation layer would read.
 */
import realisations from "../../../data/realisations.json";
import { BUSINESS, verifiedGoogleReviews } from "@/config/business";
import { FINAL_CTA, FREE_AUDIT_PATH, PROOF, PROOF_PATH } from "@/components/home/content";

export const TRUST = {
  // OWNER REVIEW: heading of the trust slot, written for STS-046 (the source has no wording).
  heading: "Why work with SarayaTech",
  // OWNER REVIEW: written for STS-046 from the home services heading ("Your website, apps and marketing, from one team").
  oneTeam: "One team for your website, apps and marketing",
  // OWNER REVIEW: written for STS-046; names come from data/realisations.json.
  launched: (names: string) => `Live projects we built: ${names}`,
  workLink: "See our work",
  /** C14 wording from the source trust line ("[4.9] stars from [X] Google reviews", REQ-052). */
  reviews: (rating: string, count: number) =>
    `${rating} stars from ${count} Google ${count === 1 ? "review" : "reviews"}`,
  reviewsLink: "Read our Google reviews",
  newTab: "(opens in a new tab)",
} as const;

/** A call-to-action button: label and destination (internal path or verified external URL). */
export interface CtaAction {
  label: string;
  href: string;
}

/** The free audit action (REQ-063). Pages that lead with booking pass it as `secondary`. */
export const FREE_AUDIT_ACTION: CtaAction = { label: FINAL_CTA.button, href: FREE_AUDIT_PATH };

/** What a trust item shows. `icon` maps to a decorative icon; the text always carries the meaning. */
export type ProofIcon = "star" | "map" | "work" | "team";

export interface ProofItem {
  id: "google-reviews" | "service-area" | "launched-work" | "one-team";
  icon: ProofIcon;
  text: string;
  link?: { label: string; href: string; external: boolean };
}

interface Realisation {
  company: string;
  isActive: boolean;
  link: string | null;
}

/** "A", "A and B", "A, B and C" (US English, no serial comma to match the home copy). */
const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** Live, allow-listed project names, in the home page order. */
export const launchedProjectNames = (data: Realisation[] = realisations as Realisation[]): string[] =>
  PROOF.projects
    .map((name) => data.find((r) => r.company === name))
    .filter((r): r is Realisation => !!r && r.isActive && !!r.link)
    .map((r) => r.company);

type ReviewsCfg = Parameters<typeof verifiedGoogleReviews>[0];

/**
 * The trust slot's items, in display order. Only verified facts; an item whose fact is missing
 * is left out entirely (never rendered empty). Pass a config to preview filled values in tests.
 */
export function proofItems(config?: ReviewsCfg, projects: string[] = launchedProjectNames()): ProofItem[] {
  const items: ProofItem[] = [];
  const reviews = verifiedGoogleReviews(config);
  if (reviews) {
    items.push({
      id: "google-reviews",
      icon: "star",
      text: TRUST.reviews(reviews.rating.toFixed(1), reviews.count),
      link: { label: TRUST.reviewsLink, href: reviews.url, external: true },
    });
  }
  if (BUSINESS.serviceAreaText) {
    items.push({ id: "service-area", icon: "map", text: BUSINESS.serviceAreaText });
  }
  if (projects.length > 0) {
    items.push({
      id: "launched-work",
      icon: "work",
      text: TRUST.launched(joinNames(projects)),
      link: { label: TRUST.workLink, href: PROOF_PATH, external: false },
    });
  }
  items.push({ id: "one-team", icon: "team", text: TRUST.oneTeam });
  return items;
}

/**
 * Pages that are themselves the conversion step show the trust slot without a second call to
 * action (a "Book" button on /contact links to itself while booking is unverified, and a "Get My
 * Free Audit" button on /free-audit does the same). /careers keeps its own job-seeker call to
 * action and gets the trust slot only, so the page does not end with two CTA bands.
 */
export const TRUST_ONLY_PATHS = ["/contact", "/free-audit", "/careers"] as const;
