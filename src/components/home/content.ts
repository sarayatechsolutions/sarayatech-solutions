/**
 * Homepage copy (STS-031). Every user-facing string on `/` lives here, not in JSX.
 *
 * Source: docs/source/SarayaTech-Website-Fix-and-Marketing-Plan.md, "New wording".
 * Deviations from the source are deliberate and recorded in
 * docs/website-remediation/04-REQUIREMENTS-MATRIX.md (I-ids) and 06-OWNER-INPUTS.md (C-ids):
 *
 *  - No prices anywhere: "Starting at [$X]" / "Projects from [$X]" are omitted (C8 open).
 *  - "30-minute" and "fixed price, no surprises" are left out until the owner confirms them (I-12).
 *  - "Ads that pay for themselves" is replaced by "Track every ad dollar" (I-3, REQ-058).
 *  - Social media lists no platform names until C9 confirms which ones are sold; the
 *    ownership sentence stays (REQ-057).
 *  - Trust line: the Google rating is omitted (C14, REQ-052); the service area comes from
 *    `BUSINESS.serviceAreaText` (C4/C5 fallback), not from this file.
 *  - Proof: "Real results for Columbus businesses" is not used until a permissioned Columbus
 *    result exists (REQ-060). The section is labelled "Our Work" (I-9) and shows what was
 *    built, with no metrics (C10 fallback).
 *
 * The site is English only (C24), so there is no i18n runtime; this module is the one place a
 * future translation layer would read from.
 */
import { CONTACT_PATH } from "@/config/business";

/** Service pages (STS-032). Literal paths: content/services imports this module for PROOF. */
const SERVICE_PAGE_PATH = {
  websiteDesign: "/services/website-design",
  appDevelopment: "/services/app-development",
  localSeo: "/services/local-seo",
  socialMedia: "/services/social-media-marketing",
  paidAds: "/services/paid-ads",
} as const;

/** Route of the proof page (I-9). STS-035 / GAP-12 may move it to /our-work with a 301. */
export const PROOF_PATH = "/realisation";

/**
 * Destination of the final CTA "Get My Free Audit" (REQ-063).
 * STS-034: the free audit page and its lead form.
 */
export const FREE_AUDIT_PATH = "/free-audit";

/**
 * Destination of the packages teaser.
 * TODO(STS-033): point to "/pricing" once the Packages & Pricing page exists, and change the
 * label to "See packages and pricing".
 */
export const PRICING_PATH = CONTACT_PATH;

export const HERO = {
  headline: "We build your website. Then we bring you customers.",
  subheadline:
    "SarayaTech is a Columbus web design and marketing team for local and small businesses. One partner for your website, app, Google presence and social media, with results you can see every month.",
  primaryCta: "Book a Free Consultation",
  secondaryCta: "See Our Work",
} as const;

export const PROBLEM = {
  heading: "Running a business is hard enough.",
  copy: "Your website is outdated, customers can't find you on Google, and social media keeps falling to the bottom of the list. Hiring a web designer and a separate marketing agency means two bills, two contracts and nobody responsible for results. SarayaTech handles all of it.",
} as const;

export interface Offering {
  title: string;
  copy: string;
  /** The offering's service page (STS-032). */
  href: string;
  /** Names where the link goes (REQ-175). */
  linkLabel: string;
}

export interface Pillar {
  id: "websites" | "apps" | "marketing";
  name: string;
  offerings: Offering[];
}

/** Three pillars, five offerings, each linking to its service page (I-1, REQ-070, STS-032). */
export const SERVICES: { heading: string; pillars: Pillar[] } = {
  heading: "Your website, apps and marketing, from one team",
  pillars: [
    {
      id: "websites",
      name: "Websites",
      offerings: [
        {
          title: "Websites that win customers",
          copy: "Fast, mobile-friendly sites built to turn visitors into calls and bookings.",
          href: SERVICE_PAGE_PATH.websiteDesign,
          linkLabel: "More about our websites",
        },
      ],
    },
    {
      id: "apps",
      name: "Apps & software",
      offerings: [
        {
          title: "Apps and custom software",
          copy: "Booking systems, customer portals and mobile apps that save you time.",
          href: SERVICE_PAGE_PATH.appDevelopment,
          linkLabel: "More about apps and custom software",
        },
      ],
    },
    {
      id: "marketing",
      name: "Marketing",
      offerings: [
        {
          title: "Get found on Google",
          copy: "Google Business Profile, local SEO and reviews, so nearby customers find you first.",
          href: SERVICE_PAGE_PATH.localSeo,
          linkLabel: "More about local SEO",
        },
        {
          title: "Social media done for you",
          copy: "Planned, posted and reported monthly. You always own your accounts.",
          href: SERVICE_PAGE_PATH.socialMedia,
          linkLabel: "More about social media",
        },
        {
          title: "Track every ad dollar",
          copy: "Google and Meta ads with tracking on every call and form.",
          href: SERVICE_PAGE_PATH.paidAds,
          linkLabel: "More about paid ads",
        },
      ],
    },
  ],
};

/** Four steps, in the source order (REQ-059). Steps 1 and 2 drop the I-12 promises. */
export const HOW_IT_WORKS = {
  heading: "How it works",
  steps: [
    {
      title: "Free consultation.",
      copy: "We review your website, Google profile and competitors with you on a call.",
    },
    { title: "Clear plan and price.", copy: "You get a written plan with a clear price." },
    { title: "We build and launch.", copy: "Your site or app goes live, set up to rank and convert." },
    {
      title: "We grow it every month.",
      copy: "Marketing, updates and a simple report showing calls, leads and traffic.",
    },
  ],
} as const;

/**
 * Proof teaser (REQ-021). Shows only projects from data/realisations.json that are live and
 * whose ownership is not in question: iSaraya and Saraya Auto Rental are excluded until C11
 * says whether they are the group's own products.
 */
export const PROOF = {
  heading: "Our Work",
  intro: "A few of the websites and apps we have built and launched.",
  projects: ["BMV INSPECTION", "MIMAP", "ASTA"],
  visitLabel: (company: string) => `Visit the ${company} website`,
  cta: "See Our Work",
} as const;

/** Packages teaser: 3 packages plus 1 custom-quote card (I-2, REQ-065). No prices (C8). */
export const PACKAGES = {
  heading: "Packages that grow with your business",
  intro: "Pick the package that fits where your business is today. We quote each one for your business.",
  packages: [
    {
      name: "Local Starter",
      for: "New or very small businesses",
      includes: "5-page website, Google Business Profile setup, review system",
    },
    {
      name: "Local Growth",
      for: "Businesses ready to grow",
      includes: "Website, local SEO, 2 social platforms, monthly report",
    },
    {
      name: "Full Growth",
      for: "Established small businesses",
      // "all 5 social platforms" waits for C9; "+ ad spend" is kept (REQ-068).
      includes:
        "Everything in Growth, plus more social platforms, Google and Meta ads management (ad spend billed separately) and a quarterly strategy call",
    },
  ],
  custom: {
    name: "Custom App or Software",
    for: "Any business with a process to automate",
    includes: "Scoping, design, build, support",
    price: "Custom quote",
  },
  forLabel: "For:",
  includesLabel: "Includes:",
  cta: "Ask for a quote",
} as const;

/** Final call to action (REQ-063). "30-minute" is left out until confirmed (I-12). */
export const FINAL_CTA = {
  heading: "Ready for more customers?",
  copy: "Book a free consultation. We'll review your website and Google profile and show you three quick wins, whether you hire us or not.",
  button: "Get My Free Audit",
} as const;
