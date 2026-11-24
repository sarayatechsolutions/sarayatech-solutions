/**
 * Our Work page copy (STS-035). Every user-facing string on /realisation lives here, not in JSX.
 * The URL stays /realisation until STS-057 sets the final scheme (I-9 names /our-work).
 *
 * Source: docs/source/SarayaTech-Website-Fix-and-Marketing-Plan.md, Pages table ("Case Studies /
 * Our Work": the problem, what you did, the result in numbers) and the "See Our Work" button.
 * Deviations are deliberate (04-REQUIREMENTS-MATRIX.md I-9, REQ-007, REQ-028, REQ-060, REQ-171,
 * REQ-172; 06-OWNER-INPUTS.md C10, C11):
 *
 *  - No "result in numbers": C10 supplies no measured results, so there is no metric,
 *    percentage, client count, year or testimonial here. The format is "what it is" and
 *    "what we built", which is all C10 says to publish (name + live link + what was built).
 *  - No "Real results for Columbus businesses" heading (REQ-060): it needs a permissioned
 *    Columbus result.
 *  - No "challenge" text and no "for [client]" line: the old challenge copy said "digital
 *    transformation" and "compete with Turo" and is not backed by an owner input. Nothing
 *    here calls a project a client until C10 (permission) and C11 (related party) answer.
 *  - Project facts are the ones already in data/realisations.json (the owner's own
 *    descriptions), reworded plainly. `PROJECT_COPY` is keyed by `company` in that file; the
 *    page renders only active entries that have a copy entry, and a test ties the two.
 *
 * Copy the source does not contain is marked `// OWNER REVIEW`.
 *
 * The site is English only (C24), so there is no i18n runtime; this module is the one place a
 * future translation layer would read from.
 */

export const WORK_HERO = {
  /** Source label for the proof page ("Our Work", I-9, REQ-171). */
  headline: "Our Work",
  // OWNER REVIEW: written for STS-035 from the old subtitle ("Websites, apps and custom software we have built and launched").
  intro: "Websites, apps and custom software we have built and launched. Here is what each one is and what we built.",
} as const;

export const WORK_LABELS = {
  whatItIs: "What it is",
  whatWeBuilt: "What we built",
  visit: (company: string) => `Visit the ${company} website`,
  // OWNER REVIEW: alt text describes the screenshot (REQ-171); no claim about who the project was for.
  alt: (company: string, language: string) => `Screenshot of the ${company} website home page${language}`,
} as const;

export interface ProjectCopy {
  /** Must match `company` in data/realisations.json. */
  company: string;
  whatItIs: string;
  whatWeBuilt: string;
  /** Appended to the alt text when the screenshot is not in English. */
  altLanguage?: string;
}

// OWNER REVIEW: each line is the owner's description in data/realisations.json, reworded; no figure added.
export const PROJECT_COPY: readonly ProjectCopy[] = [
  {
    company: "BMV INSPECTION",
    whatItIs: "An online booking platform for BMV vehicle inspections.",
    whatWeBuilt:
      "Appointment booking, an admin dashboard to manage appointments and documents, a client portal for uploading files, OCR data extraction or manual entry, and online payments.",
  },
  {
    // OWNER REVIEW (C11): shown because the brief lists it among the four; whether it is the group's own product is open.
    company: "iSaraya",
    whatItIs: "A marketplace that connects sellers and buyers.",
    whatWeBuilt:
      "Store creation, product and service sales, delivery management, and messaging between customers and vendors.",
  },
  {
    company: "MIMAP",
    whatItIs: "A clinic management interface for Mauritania Internal Medicine and Pediatrics (MIMAP).",
    whatWeBuilt: "Tools to manage consultations, prescriptions, lab tests and medical certificates.",
    altLanguage: " (in French)",
  },
  {
    company: "ASTA",
    whatItIs: "The official website of the American Senegalese Tech Academy (ASTA).",
    whatWeBuilt: "A website presenting the academy's intensive Full Stack development programs and professional training.",
  },
];

export const WORK_CTA = {
  // OWNER REVIEW: same call to action as the home and About pages.
  heading: "Have a project in mind?",
  copy: "Tell us what you need. We will talk it through in plain English.",
  button: "Book a Free Consultation",
} as const;
