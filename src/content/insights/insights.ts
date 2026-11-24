/**
 * Insights / Resources page copy (STS-040). Every user-facing string on /insights lives here.
 *
 * Source: docs/source/SarayaTech-Website-Fix-and-Marketing-Plan.md, "Pages" table (Blog / Resources =
 * practical guides for local owners) and "Blog and video topics for local search" (the five topics).
 *
 * No article is published yet (GAP-10, REQ-081; the articles wait on owner inputs C8, C18). So the
 * page lists no article card, no category, no date and no "Read Article" button (REQ-018, REQ-031),
 * and is `noindex` and out of the sitemap (src/seo/seo.ts) until the first real article exists.
 * When it does: add it to `ARTICLES` below, render the list, and delete the `noindex` flag on
 * "/insights" in STATIC_SEO.
 *
 * Copy the source does not contain is marked `// OWNER REVIEW`.
 */

/** Published articles. Empty on purpose: nothing is invented to fill the page. */
export const ARTICLES: readonly { slug: string; title: string }[] = [];

export const INSIGHTS_HERO = {
  // OWNER REVIEW: heading written for STS-040; "practical guides for local owners" is the source wording.
  headline: "Plain-English guides for local business owners",
  intro:
    "Practical guides on getting more customers from your website, Google and social media, written for Columbus small business owners.",
} as const;

export const INSIGHTS_TOPICS = {
  // OWNER REVIEW: heading and lead-in written for STS-040.
  heading: "What the guides cover",
  intro: "Each guide answers one question local owners ask us.",
  /** The five topics, as written in the source. Plain text: none is a link until its article exists. */
  items: [
    "How much does a website cost in Columbus, Ohio?",
    "How to show up on Google Maps in Columbus",
    "Best website features for Ohio restaurants, contractors or salons",
    "Do small businesses need an app?",
    "Facebook vs Instagram vs TikTok for local businesses",
  ],
} as const;

/** Destination: `bookingHref()` (C15 fallback: the contact form). Button copy matches the home and About CTAs. */
export const INSIGHTS_CTA = {
  // OWNER REVIEW: written for STS-040 from the About "Talk to the team" CTA.
  heading: "Have a question now?",
  copy: "Book a free consultation and ask us directly. We will look at your website and Google profile with you.",
  button: "Book a Free Consultation",
} as const;
