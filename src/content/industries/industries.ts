/**
 * Industry pages (STS-042, GAP-01, REQ-029). One page per industry the owner chooses (C18 in
 * docs/website-remediation/06-OWNER-INPUTS.md: "2-3 target industries"), at /industries/<slug>.
 *
 * OWNER REVIEW: C18 is OPEN, so `INDUSTRY_PAGES` is EMPTY and no industry page is routed,
 * prerendered or in the sitemap. The six enterprise verticals STS-039 retired stay retired; their
 * data and page files are kept but unrouted.
 *
 * To publish (full steps in docs/ops/owner-content.md):
 *  1. Add one entry per chosen industry below. Every field is copy the owner supplies: invent no
 *     statistic, client name, review or result (REQ-172). The entry's name, h1, intro and section
 *     text appear exactly as written.
 *  2. In public/_redirects delete the `/industries` and `/industries/` lines in the SAME change.
 *     The /industries hub page goes live with the first entry, and Cloudflare applies a redirect
 *     before a page (tests/redirects.test.mjs fails until the lines are gone). Keep `/industry`
 *     and `/industry/*`: they are the old URLs and still go to /services.
 * An entry with an `[Owner to confirm ...]` marker, an empty field or an unknown service is not
 * rendered at all.
 */
import { renderableEntries, type LocalPageEntry } from "../local/shared";

export type IndustryPage = LocalPageEntry;

export const INDUSTRIES_BASE_PATH = "/industries";
export const industryPath = (slug: string) => `${INDUSTRIES_BASE_PATH}/${slug}`;

/** Owner-supplied industry entries. EMPTY on purpose (C18 open). */
export const INDUSTRY_PAGES: readonly IndustryPage[] = [];

/** The entries that are public: complete, marker-free, unique slug. */
export const publishedIndustries = (list: readonly IndustryPage[]): IndustryPage[] => renderableEntries(list);

export const PUBLISHED_INDUSTRIES: readonly IndustryPage[] = publishedIndustries(INDUSTRY_PAGES);

/** Copy for the /industries hub, which exists only while there is a published industry. */
export const INDUSTRIES_HUB = {
  // OWNER REVIEW: hub copy written for STS-042; it names no industry or number.
  h1: "Industries we work with",
  intro: "Pick your kind of business to see how we help it get found, contacted and booked.",
  metaTitle: "Industries We Serve in Columbus, OH | SarayaTech",
  metaDescription:
    "See how SarayaTech helps local businesses in Columbus, Ohio get found on Google and win more calls and bookings. Choose your industry to read more.",
  breadcrumbLabel: "Industries",
  readLabel: "See how we help",
} as const;

export function industrySeoFor(path: string, list: readonly IndustryPage[]): { title: string; description: string } | null {
  if (path === INDUSTRIES_BASE_PATH && list.length > 0) return { title: INDUSTRIES_HUB.metaTitle, description: INDUSTRIES_HUB.metaDescription };
  const hit = list.find((e) => industryPath(e.slug) === path);
  return hit ? { title: hit.metaTitle, description: hit.metaDescription } : null;
}
