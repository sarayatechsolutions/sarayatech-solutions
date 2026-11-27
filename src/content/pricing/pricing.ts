/**
 * Packages & Pricing page copy (STS-033, REQ-027, REQ-065 to REQ-069). Every user-facing string
 * on /pricing lives here, not in JSX.
 *
 * Source: docs/source/SarayaTech-Website-Fix-and-Marketing-Plan.md, the packages table.
 * Deviations from the source are deliberate and recorded in
 * docs/website-remediation/04-REQUIREMENTS-MATRIX.md (I-ids) and 06-OWNER-INPUTS.md (C-ids):
 *
 *  - Three packages plus a separate custom-quote card, not four tiers (I-2).
 *  - Prices are `null` until the owner supplies them (C8). While null, NO number is shown and
 *    the card says "Get a fixed quote" (custom card: "Custom quote"). Setting a price renders
 *    "one-time $X", "$X/mo", "$X/mo + ad spend" or "quote from $X" via `formatPrice`.
 *  - No "fixed price", "30-minute" or any guarantee beyond the source wording (I-12).
 *  - The inclusions match the home teaser (src/components/home/content.ts): "all 5 social
 *    platforms" waits for C9 (which platforms are sold), so Full Growth says "more social
 *    platforms". "Review system" is neutral wording (I-6, REQ-074): no filtering, no incentive.
 *
 * Copy the source does not contain is marked `// OWNER REVIEW`.
 *
 * The site is English only (C24), so there is no i18n runtime; this module is the one place a
 * future translation layer would read from.
 */

import { CONSULTATION_CTA_LABEL } from "@/content/cta";

/** How a price is written (REQ-066 to REQ-069). */
export type PriceKind = "one-time" | "monthly" | "monthly-plus-ad-spend" | "quote-from";

export interface PackageDef {
  id: "local-starter" | "local-growth" | "full-growth";
  name: string;
  for: string;
  inclusions: readonly string[];
  priceKind: PriceKind;
  /**
   * Whole US dollars, or null while the owner has not set it.
   * TODO(owner C8): Local Starter one-time price, Local Growth monthly price, Full Growth monthly
   * price. Set the number here and the page renders it; nothing else changes.
   */
  price: number | null;
  /** Shown under the price slot; for Full Growth it states the ad-spend rule (REQ-068). */
  priceNote?: string;
}

export interface CustomDef {
  id: "custom-app";
  name: string;
  for: string;
  inclusions: readonly string[];
  priceKind: "quote-from";
  /** TODO(owner C8): the "quote from $X" starting value for custom apps and software. */
  price: number | null;
}

export const PRICING_HERO = {
  headline: "Packages & Pricing",
  // OWNER REVIEW: intro written for STS-033 from the home packages intro; promises no price or guarantee.
  intro:
    "Pick the package that fits where your business is today. Each one is quoted for your business, so you see a clear price in writing before anything starts.",
  cta: CONSULTATION_CTA_LABEL,
} as const;

export const PRICING_PACKAGES: { heading: string; forLabel: string; includesLabel: string; packages: readonly PackageDef[] } = {
  heading: "Choose a package",
  forLabel: "For:",
  includesLabel: "What's included",
  packages: [
    {
      id: "local-starter",
      name: "Local Starter",
      for: "New or very small businesses",
      inclusions: ["5-page website", "Google Business Profile setup", "Review system"],
      priceKind: "one-time",
      price: null,
    },
    {
      id: "local-growth",
      name: "Local Growth",
      for: "Businesses ready to grow",
      inclusions: ["Website", "Local SEO", "2 social platforms", "Monthly report"],
      priceKind: "monthly",
      price: null,
    },
    {
      id: "full-growth",
      name: "Full Growth",
      for: "Established small businesses",
      inclusions: [
        "Everything in Local Growth",
        "More social platforms",
        "Google and Meta ads management",
        "Quarterly strategy call",
      ],
      priceKind: "monthly-plus-ad-spend",
      price: null,
      // Ad spend is paid to the ad platforms, separate from the package (REQ-068).
      priceNote: "Ad spend is billed separately.",
    },
  ],
};

/** The custom card is a quote entry, not a fourth tier (I-2, REQ-069). */
export const PRICING_CUSTOM: { heading: string; card: CustomDef } = {
  heading: "Something more specific?",
  card: {
    id: "custom-app",
    name: "Custom App or Software",
    for: "Any business with a process to automate",
    inclusions: ["Scoping", "Design", "Build", "Support"],
    priceKind: "quote-from",
    price: null,
  },
};

export const PRICING_LABELS = {
  /** Shown on a package while its price is null (REQ-027). */
  quoteWording: "Get a fixed quote",
  /** Shown on the custom card while its price is null (REQ-069). */
  customQuoteWording: "Custom quote",
  packageCta: "Get a fixed quote",
  customCta: "Request a custom quote",
  auditCta: "Get My Free Audit",
} as const;

export const PRICING_HOW = {
  // OWNER REVIEW: written for STS-033 from the home "How it works" steps; no price, time or result promised.
  heading: "How a quote works",
  steps: [
    "Book a free consultation. We review your website, Google profile and competitors with you.",
    "You get a written plan with a clear price.",
    "If it fits, we build and launch, then grow it every month.",
  ],
} as const;

export const PRICING_CTA = {
  // OWNER REVIEW: closing call to action written for STS-033.
  heading: "Not sure which package fits?",
  copy: "Tell us about your business and we will recommend one, or ask for a free audit first. No obligation either way.",
  button: CONSULTATION_CTA_LABEL,
} as const;

const usd = (n: number): string => `$${n.toLocaleString("en-US")}`;

/**
 * The price line for a card, or null when no price is set (the page then shows the quote wording
 * and no number). A non-finite or negative value is treated as unset, so a bad config cannot
 * print "$NaN".
 */
export function formatPrice(kind: PriceKind, price: number | null): string | null {
  if (price === null || !Number.isFinite(price) || price < 0) return null;
  switch (kind) {
    case "one-time":
      return `one-time ${usd(price)}`;
    case "monthly":
      return `${usd(price)}/mo`;
    case "monthly-plus-ad-spend":
      return `${usd(price)}/mo + ad spend`;
    case "quote-from":
      return `quote from ${usd(price)}`;
  }
}
