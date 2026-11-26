/**
 * Shared rules for owner-gated local pages: industry pages (STS-042, GAP-01) and service-area pages
 * (STS-043, GAP-02). Pure data helpers, no React and no site imports except blog.ts's placeholder
 * pattern, so the SEO layer can use them without a cycle.
 *
 * The principle: a page exists only because the owner supplied its facts. Both lists are EMPTY by
 * default, so nothing is routed, prerendered, in the sitemap or linked until the owner adds an
 * entry. An entry that is incomplete, still carries an `[Owner to confirm ...]` marker or names an
 * unknown service is NOT rendered (it is dropped, never half-published).
 */
import { PLACEHOLDER_PATTERN } from "../insights/blog";

/** One block of owner-supplied copy: an h2 and its paragraphs. */
export interface ContentSection {
  heading: string;
  paragraphs: string[];
}

/** The five live service page slugs (src/content/services/services.ts); kept here to avoid importing its data. */
export const SERVICE_SLUGS = [
  "website-design",
  "app-development",
  "local-seo",
  "social-media-marketing",
  "paid-ads",
] as const;
export type LocalServiceSlug = (typeof SERVICE_SLUGS)[number];

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Fields every local page entry carries. */
export interface LocalPageEntry {
  /** URL slug: lowercase letters, digits, hyphens. */
  slug: string;
  /** Plain name used in navigation and breadcrumbs: "Restaurants", "Hilliard". */
  name: string;
  h1: string;
  /** The <title>, 35 to 60 characters. */
  metaTitle: string;
  /** Meta description, 100 to 160 characters, different from the h1. */
  metaDescription: string;
  /** Opening paragraph, written for THIS page. */
  intro: string;
  sections: ContentSection[];
  /** Service pages this page links to (at least one). */
  services: LocalServiceSlug[];
}

/** Every string the entry would put on the page or in its head. */
export function entryTexts(e: LocalPageEntry): string[] {
  return [
    e.name,
    e.h1,
    e.metaTitle,
    e.metaDescription,
    e.intro,
    ...e.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
  ];
}

/** Why an entry is not renderable (empty = fine). */
export function entryBlockers(e: LocalPageEntry): string[] {
  const out: string[] = [];
  if (!SLUG_PATTERN.test(e.slug)) out.push("invalid slug");
  const required: [string, string][] = [
    ["name", e.name],
    ["h1", e.h1],
    ["metaTitle", e.metaTitle],
    ["metaDescription", e.metaDescription],
    ["intro", e.intro],
  ];
  for (const [k, v] of required) if (!v.trim()) out.push(`empty ${k}`);
  const badSection = (s: ContentSection) => !s.heading.trim() || s.paragraphs.length === 0 || s.paragraphs.some((p) => !p.trim());
  if (e.sections.length === 0 || e.sections.some(badSection)) out.push("needs at least one section, each with a heading and text");
  if (e.services.length === 0 || e.services.some((s) => !SERVICE_SLUGS.includes(s))) out.push("needs one or more real service slugs");
  if (entryTexts(e).some((t) => PLACEHOLDER_PATTERN.test(t))) out.push("an [Owner to confirm ...] marker is still in the text");
  return out;
}

/** Entries that pass `entryBlockers`, with a unique slug (the first one wins), in list order. */
export function renderableEntries<T extends LocalPageEntry>(list: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of list) {
    if (entryBlockers(e).length || seen.has(e.slug)) continue;
    seen.add(e.slug);
    out.push(e);
  }
  return out;
}

/** Text compared for sameness: lower case, punctuation and extra spaces removed. */
export const normalizeText = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/**
 * An intro with the entry's own name taken out, so "Hilliard has..." and "Dublin has..." compare
 * equal. That is the swapped-city-name boilerplate a doorway page is made of.
 */
export function introSignature(intro: string, name: string): string {
  const n = normalizeText(name);
  const t = normalizeText(intro);
  return n ? t.split(n).join(" ").replace(/\s+/g, " ").trim() : t;
}

/** Labels shared by the industry and service-area page template. */
export const LOCAL_PAGE_LABELS = {
  primaryCta: "Request a free audit",
  servicesHeading: "Services that fit",
  servicesIntro: "Pick the service you want to know more about.",
  breadcrumbAria: "Breadcrumb",
  homeLabel: "Home",
} as const;
