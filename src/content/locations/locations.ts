/**
 * Service-area pages (STS-043, GAP-02, REQ-033, REQ-078, I-10). One page per suburb the owner has
 * CONFIRMED the business really serves (C5 in 06-OWNER-INPUTS.md), at /locations/<slug>. The path
 * is the one 04-REQUIREMENTS-MATRIX.md names for REQ-033 (`/locations/<area>`).
 *
 * OWNER REVIEW: C5 is OPEN, so `SERVICE_AREAS` is EMPTY and no area page is routed, prerendered or
 * in the sitemap. Columbus itself is covered by the home and service pages.
 *
 * No doorway pages. An entry is rendered only when ALL hold:
 *   - `ownerConfirmed` is true (the owner confirmed real coverage of this suburb);
 *   - its `intro` is its own text: at least MIN_INTRO_LENGTH characters, and not the same text as
 *     another entry's intro, also after the suburb's name is taken out ("Hilliard has..." and
 *     "Dublin has..." count as the same intro);
 *   - it passes the shared entry rules (no [Owner to confirm ...] marker, a real service link, ...).
 * src/content/locations/locations.test.ts fails if two entries in SERVICE_AREAS share an intro.
 *
 * Write only facts the owner supplied: a real project in the area, a real service detail. Invent no
 * drive time, client, statistic or review. Also add the suburb to `BUSINESS.areas` in
 * src/config/business.ts (C5) so the schema's areaServed matches. Steps: docs/ops/owner-content.md.
 */
import { introSignature, normalizeText, renderableEntries, type LocalPageEntry } from "../local/shared";

export interface ServiceAreaPage extends LocalPageEntry {
  /** True only after the owner confirmed the business really serves this suburb (C5). */
  ownerConfirmed: boolean;
}

export const MIN_INTRO_LENGTH = 120;

export const LOCATIONS_BASE_PATH = "/locations";
export const areaPath = (slug: string) => `${LOCATIONS_BASE_PATH}/${slug}`;

/** Owner-confirmed suburbs. EMPTY on purpose (C5 open). */
export const SERVICE_AREAS: readonly ServiceAreaPage[] = [];

/** Entries whose intro is shared with another entry (all of them, so none is silently preferred). */
export function duplicateIntroSlugs(list: readonly ServiceAreaPage[]): string[] {
  const dup = new Set<string>();
  // Two keys: the text as written (an exact copy) and with each entry own name removed (a swapped name).
  for (const key of [(e: ServiceAreaPage) => normalizeText(e.intro), (e: ServiceAreaPage) => introSignature(e.intro, e.name)]) {
    const by = new Map<string, string[]>();
    for (const e of list) by.set(key(e), [...(by.get(key(e)) ?? []), e.slug]);
    for (const slugs of by.values()) if (slugs.length > 1) slugs.forEach((x) => dup.add(x));
  }
  return [...dup];
}

/** The area pages that are public. */
export function publishedAreas(list: readonly ServiceAreaPage[]): ServiceAreaPage[] {
  const dup = new Set(duplicateIntroSlugs(list));
  return renderableEntries(list).filter((e) => e.ownerConfirmed && e.intro.trim().length >= MIN_INTRO_LENGTH && !dup.has(e.slug));
}

export const PUBLISHED_AREAS: readonly ServiceAreaPage[] = publishedAreas(SERVICE_AREAS);

export function areaSeoFor(path: string, list: readonly ServiceAreaPage[]): { title: string; description: string } | null {
  const hit = list.find((e) => areaPath(e.slug) === path);
  return hit ? { title: hit.metaTitle, description: hit.metaDescription } : null;
}
