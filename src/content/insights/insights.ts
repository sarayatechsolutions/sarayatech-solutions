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
 * STS-055 built all of that: `ARTICLES` below is now derived from the approved posts
 * (src/content/insights/posts.ts, rules in blog.ts). While none is approved the page is exactly as
 * described above; the first approved post lists itself, drops the noindex flag and joins the sitemap.
 *
 * Copy the source does not contain is marked `// OWNER REVIEW`.
 */

import { PUBLISHED_POSTS } from "./posts";
import { CONSULTATION_CTA_LABEL } from "@/content/cta";

/** Published articles. Empty until the owner approves a post: nothing is invented to fill the page. */
export const ARTICLES: readonly { slug: string; title: string }[] = PUBLISHED_POSTS.map((p) => ({
  slug: p.slug,
  title: p.title,
}));

/** Labels for the article list (shown only once a post is approved). */
export const INSIGHTS_ARTICLES = {
  heading: "Latest guides",
  readLabel: "Read the guide",
  breadcrumbLabel: "Insights",
  breadcrumbAria: "Breadcrumb",
  homeLabel: "Home",
} as const;

/** Which post answers each topic, so a topic with a published guide moves from the plain list to the article list. */
export const INSIGHTS_TOPIC_SLUGS: Readonly<Record<string, string>> = {
  "How much does a website cost in Columbus, Ohio?": "website-cost-columbus",
  "How to show up on Google Maps in Columbus": "google-maps-columbus",
  "Best website features for Ohio restaurants, contractors or salons": "website-features-ohio-industry",
  "Do small businesses need an app?": "small-business-app",
  "Facebook vs Instagram vs TikTok for local businesses": "facebook-instagram-tiktok",
};

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
  button: CONSULTATION_CTA_LABEL,
} as const;
