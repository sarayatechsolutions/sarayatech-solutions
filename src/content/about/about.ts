/**
 * About page copy (STS-036). Every user-facing string on /about lives here, not in JSX.
 *
 * Source: docs/source/SarayaTech-Website-Fix-and-Marketing-Plan.md, "About section" and the
 * "Pages" table (About = founder photo and story, team, why Columbus, values).
 * Deviations from the source are deliberate and recorded in
 * docs/website-remediation/04-REQUIREMENTS-MATRIX.md and 06-OWNER-INPUTS.md (C-ids):
 *
 *  - "founded in [year] by [founder name]" is cut from the source sentence until C7 supplies
 *    both (REQ-062, I-5). No founding year, client count or percentage appears anywhere.
 *  - "We answer our phone" is cut: no public phone number is published yet (C2).
 *  - The founder photo, story and "why Columbus" are the owner's to tell (C7). `FOUNDER` is
 *    null, so that section is not rendered. No placeholder text reaches the page (REQ-178).
 *  - The team is the four people in data/leadership-team.json, with their bios as written
 *    there (C28 fallback: personal experience claims are kept). The stock group photo that
 *    was presented as "SarayaTech Team" is no longer rendered (REQ-015).
 *  - The location line is `BUSINESS.serviceAreaText` (C4/C5 fallback), not a string here.
 *
 * Copy the source does not contain is marked `// OWNER REVIEW`. It is built only from wording
 * the source or the already-approved home page uses, and states no number, year or result.
 *
 * The site is English only (C24), so there is no i18n runtime; this module is the one place a
 * future translation layer would read from.
 */
import leadershipTeam from "../../../data/leadership-team.json";
import { CONSULTATION_CTA_LABEL } from "@/content/cta";

export const ABOUT_HERO = {
  /** Source heading, word for word. */
  headline: "Your neighbors in tech",
  /** Source copy without the [year]/[founder] clause (C7) and the phone promise (C2). */
  intro:
    "SarayaTech gives Columbus small businesses the same quality of websites and marketing that big companies get, at a price that makes sense. We explain things in plain English and measure our work by your results.",
  cta: CONSULTATION_CTA_LABEL,
} as const;

/** Who the page is for. Neutral until the owner's own "why Columbus" (C7) replaces it. */
export const ABOUT_WHO = {
  // OWNER REVIEW: heading and copy written for STS-036 from the home hero and problem copy.
  heading: "Built for Columbus small businesses",
  paragraphs: [
    "We work with local and small businesses in Columbus and central Ohio. One team handles your website, apps, Google presence and social media, so you are not paying two bills to two companies with nobody responsible for results.",
  ],
} as const;

/**
 * Founder photo, story and why Columbus (REQ-030, REQ-062, REQ-178).
 *
 * TODO(owner C7): founder name, photo, founding year, story and why Columbus. Until the owner
 * supplies them this stays null and the About page renders no founder section at all: no
 * "[founder]", no "Lorem", no invented year. Fill every field from the owner's own words; do
 * not paraphrase a year or a client count into it.
 */
export interface FounderStory {
  heading: string;
  name: string;
  role: string;
  /** Path under public/, e.g. "/images/founder.webp". null = no photo is shown. */
  photo: string | null;
  paragraphs: readonly string[];
}

export const FOUNDER: FounderStory | null = null;

/** How we work. Each item restates a promise the source or the approved home copy already makes. */
export const ABOUT_VALUES = {
  // OWNER REVIEW: heading and item wording written for STS-036.
  heading: "How we work",
  items: [
    {
      title: "Plain English",
      // Source: "explain things in plain English".
      copy: "We explain what we are doing and why, without jargon, so you can make the call.",
    },
    {
      title: "A clear plan and price",
      // Home "How it works", step 2.
      copy: "Before work starts, you get a written plan with a clear price.",
    },
    {
      title: "Measured by your results",
      // Source: "measure our work by your results"; home step 4: "calls, leads and traffic".
      copy: "We report the calls, leads and traffic your website and marketing bring in.",
    },
  ],
} as const;

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  /** Real portrait under public/images, or null when the repo has none (no stand-in image). */
  photo: string | null;
}

/** The repo's stand-in image. A member with only this has no photo, and none is faked. */
const PLACEHOLDER_IMAGE = "/images/placeholder-project.svg";

export const ABOUT_TEAM = {
  heading: "Meet the team",
  // OWNER REVIEW: intro written for STS-036.
  intro: "The people who design, build and look after your website and software.",
  photoAlt: (name: string) => `Portrait of ${name}`,
  members: (leadershipTeam as { name: string; role: string; bio: string; image?: string }[]).map(
    (m): TeamMember => ({
      name: m.name.trim(),
      role: m.role.trim(),
      bio: m.bio.trim(),
      photo: m.image && m.image !== PLACEHOLDER_IMAGE ? m.image : null,
    }),
  ),
};

/** Final call to action. Destination: `bookingHref()` (C15 fallback: the contact form). */
export const ABOUT_CTA = {
  // OWNER REVIEW: heading written for STS-036; copy from the home "How it works" step 1.
  heading: "Talk to the team",
  copy: "Book a free consultation and we will review your website and Google profile with you.",
  button: CONSULTATION_CTA_LABEL,
} as const;

/** Initials for a member without a portrait, e.g. "Baye Lam" -> "BL". Decorative only. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .join("");
