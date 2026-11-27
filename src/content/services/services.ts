/**
 * Service pages copy (STS-032). Every user-facing string on /services/* lives here, not in JSX.
 *
 * Source: docs/source/SarayaTech-Website-Fix-and-Marketing-Plan.md: the "Pages" table (what each
 * page must contain), "Services section", "How it works", "Packages" and the local SEO checklist.
 * Deviations are deliberate and recorded in docs/website-remediation/04-REQUIREMENTS-MATRIX.md
 * (I-ids) and 06-OWNER-INPUTS.md (C-ids):
 *
 *  - No prices anywhere (C8 open, REQ-022/023/025/026, REQ-054/055). Each page still has its
 *    price element, stating that the work is quoted. No "fixed price" (I-12).
 *  - No "30-minute" call (I-12). No metric, client count or testimonial (C10, C12).
 *  - Social media names no platform until C9 confirms which ones are sold; the ownership sentence
 *    stays word for word (REQ-025, REQ-057).
 *  - The ads page heading is "Track every ad dollar" (I-3, REQ-058). Ad spend is stated as separate
 *    from the management fee (REQ-026).
 *  - Review wording is neutral: every customer is asked, no filtering, no incentive (I-6, REQ-024).
 *  - Samples and examples come only from the projects the home page already shows (C10 fallback:
 *    project name, live link and what was built, no metrics).
 *
 * Copy the source does not contain (timeline wording, FAQ answers, the "What's included" items,
 * the app process descriptions) is marked `// OWNER REVIEW` and must be confirmed by the owner
 * before launch. It states no number, price, duration or result.
 *
 * The site is English only (C24), so there is no i18n runtime; this module is the one place a
 * future translation layer would read from.
 */
import realisations from "../../../data/realisations.json";
import { PROOF } from "@/components/home/content";
import { CONSULTATION_CTA_LABEL } from "@/content/cta";

export type ServiceSlug = "website-design" | "app-development" | "local-seo" | "social-media-marketing" | "paid-ads";

export interface ServiceItem {
  title: string;
  copy: string;
}

/** One section of a service page. `id` is stable and used by tests (data-service-section). */
export type ServiceSection =
  | { kind: "list"; id: string; heading: string; intro?: string; items: ServiceItem[] }
  | { kind: "steps"; id: string; heading: string; intro?: string; items: ServiceItem[] }
  | { kind: "text"; id: string; heading: string; paragraphs: string[] }
  | { kind: "projects"; id: string; heading: string; intro: string; projects: string[] }
  | { kind: "faq"; id: string; heading: string; items: { question: string; answer: string }[] };

export interface ServicePageContent {
  slug: ServiceSlug;
  /** Short label for navigation (footer, "Other services"). */
  navLabel: string;
  /** Line above the h1: the service and the city, in plain words. */
  eyebrow: string;
  h1: string;
  intro: string;
  sections: ServiceSection[];
}

export const SERVICES_BASE_PATH = "/services";
export const servicePath = (slug: ServiceSlug) => `${SERVICES_BASE_PATH}/${slug}`;

/** Labels shared by every service page. */
export const SERVICE_PAGE_LABELS = {
  primaryCta: CONSULTATION_CTA_LABEL,
  otherServicesHeading: "Other services",
  visitLabel: PROOF.visitLabel,
  opensInNewTab: "(opens in a new tab)",
  proofCta: "See all our work",
} as const;

/** Quote wording used wherever the source asks for a price (C8 fallback, I-12). */
const QUOTED = "We quote every project for your business after a free consultation, in a written plan you see before any work starts.";

export const SERVICE_PAGES: ServicePageContent[] = [
  {
    slug: "website-design",
    navLabel: "Website Design",
    eyebrow: "Website design in Columbus, OH",
    h1: "Websites that win customers",
    intro: "Fast, mobile-friendly sites built to turn visitors into calls and bookings.",
    sections: [
      {
        kind: "list",
        id: "included",
        heading: "What's included",
        // OWNER REVIEW: item copy beyond the source's one-line offering.
        items: [
          {
            title: "Mobile-friendly design",
            copy: "Most of your customers find you on a phone, so every page is designed to read and work well on one.",
          },
          {
            title: "Built for calls and bookings",
            copy: "A clear next step on every page, so a visitor can call you, book a time or send a message.",
          },
          {
            title: "Fast pages",
            copy: "Pages load quickly, so visitors see your business instead of a blank screen.",
          },
          {
            title: "Set up to be found",
            copy: "Each page gets its own title and description, and your site is ready for Google to read from day one.",
          },
        ],
      },
      {
        kind: "projects",
        id: "samples",
        heading: "Sample sites",
        intro: "Websites and web platforms we have built and launched.",
        projects: ["ASTA", "BMV INSPECTION"],
      },
      { kind: "text", id: "price", heading: "Price", paragraphs: [QUOTED] },
      {
        kind: "text",
        id: "timeline",
        heading: "Timeline",
        // OWNER REVIEW: no duration is given until the owner confirms one.
        paragraphs: [
          "Your written plan sets out the timeline before work starts, from the first design to launch day.",
        ],
      },
      {
        kind: "faq",
        id: "faq",
        heading: "Questions owners ask",
        // OWNER REVIEW: answers are not in the source.
        items: [
          {
            question: "How much does a website cost?",
            answer:
              "It depends on how many pages and features your business needs. After a free consultation you get a written plan with a clear price.",
          },
          {
            question: "How long does it take?",
            answer: "The timeline is in your written plan, agreed with you before any work starts.",
          },
          {
            question: "Will my website work on phones?",
            answer: "Yes. Every site we build is mobile-friendly.",
          },
          {
            question: "Can you also help customers find me on Google?",
            answer:
              "Yes. We set up your Google Business Profile and local SEO, so you have one partner for your website and your Google presence.",
          },
        ],
      },
    ],
  },
  {
    slug: "app-development",
    navLabel: "App Development",
    eyebrow: "App and custom software development in Columbus, OH",
    h1: "Apps and custom software that save you time",
    intro: "Booking systems, customer portals and mobile apps for small businesses with a process to automate.",
    sections: [
      {
        kind: "list",
        id: "types",
        heading: "Apps we build",
        // OWNER REVIEW: item copy beyond the source's one-line offering.
        items: [
          { title: "Booking systems", copy: "Let customers book an appointment online instead of calling to find a time." },
          { title: "Customer portals", copy: "A private space where your customers upload documents, check status or pay." },
          { title: "Mobile apps", copy: "An app your customers or your team carry on their phone." },
          { title: "Tools for your process", copy: "Software that takes over a repetitive task your team does by hand today." },
        ],
      },
      {
        kind: "projects",
        id: "examples",
        heading: "Examples",
        intro: "Apps and platforms we have built and launched.",
        projects: ["BMV INSPECTION", "MIMAP"],
      },
      {
        kind: "steps",
        id: "process",
        heading: "How a project works",
        // Step names from the source's Custom App package; OWNER REVIEW for the descriptions.
        items: [
          { title: "Scoping", copy: "We map the process the app has to handle and agree on what the first version does." },
          { title: "Design", copy: "You see and approve the screens before we build them." },
          { title: "Build", copy: "We build the app and launch it." },
          { title: "Support", copy: "After launch we keep it running and help with changes." },
        ],
      },
      {
        kind: "text",
        id: "price",
        heading: "Price",
        paragraphs: ["Every app is different, so every app gets a custom quote after scoping, in a written plan you see before any work starts."],
      },
    ],
  },
  {
    slug: "local-seo",
    navLabel: "Local SEO",
    eyebrow: "Local SEO and Google visibility in Columbus, OH",
    h1: "Get found on Google",
    intro: "Google Business Profile, local SEO and reviews, so nearby customers find you first.",
    sections: [
      {
        kind: "list",
        id: "google-business-profile",
        heading: "Google Business Profile setup",
        items: [
          {
            title: "Claimed and verified",
            copy: "We claim and verify your Google Business Profile and choose the categories that match what you do.",
          },
          {
            title: "Every field filled in",
            copy: "Services, service area, hours, phone, website and real photos of your business. No stock photos.",
          },
          { title: "Kept current", copy: "We post updates, finished projects and tips to your profile." },
        ],
      },
      {
        kind: "text",
        id: "reviews",
        heading: "Reviews",
        paragraphs: [
          "We set up a direct review link so you can ask every customer for a Google review, and we help you reply to every review you get.",
        ],
      },
      {
        kind: "text",
        id: "local-rankings",
        heading: "Local rankings",
        paragraphs: [
          "Your name, address and phone are written the same way on Google and the other directories customers use, so search engines connect every listing to your business.",
          "We match your pages to the searches nearby customers type, such as the service you offer plus your city.",
        ],
      },
      {
        kind: "text",
        id: "monthly-reporting",
        heading: "Monthly reporting",
        paragraphs: ["Every month you get a simple report showing calls, leads and traffic."],
      },
      { kind: "text", id: "price", heading: "Price", paragraphs: [QUOTED] },
    ],
  },
  {
    slug: "social-media-marketing",
    navLabel: "Social Media",
    eyebrow: "Social media marketing in Columbus, OH",
    h1: "Social media done for you",
    intro: "Planned, posted and reported monthly. You always own your accounts.",
    sections: [
      {
        kind: "text",
        id: "platforms",
        heading: "Platforms we manage",
        // OWNER REVIEW. C9: no platform is named until the owner confirms which ones are sold.
        paragraphs: ["We agree on the platforms that fit your customers during your free consultation."],
      },
      {
        kind: "steps",
        id: "content-plan",
        heading: "Your content plan",
        items: [
          { title: "Planned", copy: "Each month starts with a plan of what we will post and when." },
          { title: "Posted", copy: "We create and publish the posts, so social media stops falling to the bottom of your list." },
          { title: "Reported", copy: "At the end of the month you get a simple report on what we posted and how it did." },
        ],
      },
      {
        kind: "text",
        id: "ownership",
        heading: "Your accounts stay yours",
        // First sentence is the source's, word for word (REQ-025). OWNER REVIEW for the second.
        paragraphs: ["You always own your accounts. We post for you, and the accounts stay in your business's name."],
      },
      {
        kind: "text",
        id: "price",
        heading: "Monthly price",
        paragraphs: ["Social media is a monthly service. We quote your monthly price after a free consultation, in a written plan you see before any work starts."],
      },
    ],
  },
  {
    slug: "paid-ads",
    navLabel: "Paid Ads",
    eyebrow: "Google and Meta ads management in Columbus, OH",
    h1: "Track every ad dollar",
    intro: "Google and Meta ads with tracking on every call and form.",
    sections: [
      {
        kind: "list",
        id: "google-and-meta",
        heading: "Google and Meta ads",
        items: [
          { title: "Google Ads", copy: "Ads in front of people already searching for what you offer." },
          { title: "Meta ads", copy: "Ads that put your business in front of people in your area while they scroll." },
        ],
      },
      {
        kind: "text",
        id: "tracking",
        heading: "How we track results",
        paragraphs: [
          "Before an ad goes live, we set up tracking on every call and form, so you can see which ads bring in leads and which do not.",
          // OWNER REVIEW: paraphrases the source's budget guide.
          "Your monthly report shows what each campaign brought in, and the budget goes to the ads that work.",
        ],
      },
      {
        kind: "text",
        id: "management-fee",
        heading: "Management fee",
        paragraphs: [
          "We charge a management fee for running your ads, quoted for your business after a free consultation. Your ad spend is separate from our fee.",
        ],
      },
    ],
  },
];

/** Content for a slug. Throws on an unknown slug: routes are built from this list. */
export function getServicePage(slug: ServiceSlug): ServicePageContent {
  const page = SERVICE_PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`unknown service page: ${slug}`);
  return page;
}

interface Realisation {
  company: string;
  industry: string;
  solution: string;
  isActive: boolean;
  link: string | null;
}

export interface ServiceProject {
  company: string;
  industry: string;
  /** First sentence of the project description: what was built, nothing else (C10 fallback). */
  summary: string;
  link: string;
}

const firstSentence = (text: string) => text.split(/(?<=\.)\s+/)[0];

/**
 * The named projects, in order, keeping only those on the home page's allow-list that are live and
 * have a public link. A project dropped from the data or the allow-list disappears here too.
 */
export function serviceProjects(names: string[], data: Realisation[] = realisations as Realisation[]): ServiceProject[] {
  const allowed = new Set<string>(PROOF.projects);
  return names
    .filter((name) => allowed.has(name))
    .map((name) => data.find((r) => r.company === name))
    .filter((r): r is Realisation & { link: string } => !!r && r.isActive && !!r.link)
    .map((r) => ({ company: r.company, industry: r.industry, summary: firstSentence(r.solution), link: r.link }));
}
