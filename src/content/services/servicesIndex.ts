import { CONSULTATION_CTA_LABEL } from "@/content/cta";

/**
 * Copy for the /services hub (STS-039). It replaces the retired /solutions index as the one page
 * that lists everything SarayaTech sells, and it is the 301 target for every retired solution or
 * industry page that has no closer service page (07-ANALYTICS-AND-SEO.md section 3.4).
 *
 * The body reuses the home page's service pillars (src/components/home/content.ts), so the five
 * offerings are described in one place. Only the hero below is new. It follows the source's
 * "Keep the focus on websites, apps and marketing" and states no price, number or result (C8, C9).
 * OWNER REVIEW: the eyebrow and intro wording.
 */
export const SERVICES_INDEX = {
  eyebrow: "Services for small businesses in Columbus, OH",
  h1: "Our services",
  intro: "Websites, apps and marketing for small businesses. Pick a service to see what's included and how we work.",
  primaryCta: CONSULTATION_CTA_LABEL,
} as const;
