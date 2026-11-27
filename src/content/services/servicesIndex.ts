import { CONSULTATION_CTA_LABEL } from "@/content/cta";
import { servicePath, type ServiceSlug } from "@/content/services/services";

/**
 * Copy for the /services hub (STS-039). It replaces the retired /solutions index as the one page
 * that lists everything SarayaTech sells, and it is the 301 target for every retired solution or
 * industry page that has no closer service page (07-ANALYTICS-AND-SEO.md section 3.4).
 *
 * The body reuses the home page's service pillars (src/components/home/content.ts), so the five
 * offerings are described in one place, and adds three "what's included" points per service so
 * the hub says more than the home block (design audit B5, FD-19). Only the hero and those points
 * are new. It follows the source's
 * "Keep the focus on websites, apps and marketing" and states no price, number or result (C8, C9).
 * OWNER REVIEW: the eyebrow and intro wording.
 */
export const SERVICES_INDEX = {
  eyebrow: "Services for small businesses in Columbus, OH",
  h1: "Our services",
  intro: "Websites, apps and marketing for small businesses. Pick a service to see what's included and how we work.",
  primaryCta: CONSULTATION_CTA_LABEL,
} as const;

/**
 * Three "what's included" points per service, keyed by the service page path (design audit B5,
 * FD-19). Each is taken from that service page's own copy (src/content/services/services.ts): an
 * item title, a section heading, or a phrase of the page intro. Nothing here is new information.
 * OWNER REVIEW, with the service pages.
 */
const highlights: Record<ServiceSlug, readonly [string, string, string]> = {
  // "What's included" item titles.
  "website-design": ["Mobile-friendly design", "Fast pages", "Built for calls and bookings"],
  // "Apps we build" item titles.
  "app-development": ["Booking systems", "Customer portals", "Mobile apps"],
  // Section headings.
  "local-seo": ["Google Business Profile setup", "Local rankings", "Monthly reporting"],
  // Section headings, and the "Posted" step's copy.
  "social-media-marketing": ["Your content plan", "We create and publish the posts", "Your accounts stay yours"],
  // "Google and Meta ads" item titles, and the page intro.
  "paid-ads": ["Google Ads", "Meta ads", "Tracking on every call and form"],
};

export const SERVICE_HIGHLIGHTS: Record<string, readonly string[]> = Object.fromEntries(
  (Object.keys(highlights) as ServiceSlug[]).map((slug) => [servicePath(slug), highlights[slug]]),
);
