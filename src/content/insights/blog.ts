/**
 * Blog post model and the pure publishing rules (STS-055, GAP-10, REQ-118 to REQ-122).
 *
 * The site must never publish an unapproved article or an unconfirmed fact. A post is public only
 * when ALL of these hold (`isPublishable`):
 *   1. `approved` is true (the owner's written approval, README "Publish steps" 3);
 *   2. no `[Owner to confirm ...]` (or legacy `[OWNER` / `[VERIFY`) marker is left in any text a
 *      reader or a crawler can see (title, descriptions, intro, sections);
 *   3. it has a slug, a title, a meta title, a description and an ISO date;
 *   4. every inline link target is an internal path or an https: URL (`postLinkTarget`, A7-2).
 * Routes, the prerender list, the sitemap, head tags, JSON-LD and the /insights list all read
 * `publishedPosts()`, so none of them can disagree. This module imports only the dependency-free link
 * policy (src/lib/links.ts), so the SEO layer can use it without a cycle.
 */

import { classifyHref, type LinkTarget } from "@/lib/links";

/** Inline markup used in body text: [label](/path), **bold**, *italic*. Nothing else, no raw HTML. */
export type PostBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  /** An owner instruction shown inside the draft. Never allowed on an approved post. */
  | { kind: "callout"; text: string };

export interface PostSection {
  /** The section's h2. Undefined only for text that precedes the first h2. */
  heading?: string;
  blocks: PostBlock[];
}

export interface BlogPost {
  /** URL slug: lowercase letters, digits and hyphens. The page lives at /insights/<slug>. */
  slug: string;
  /** The article's single h1. */
  title: string;
  /** The <title> (35 to 60 characters, brand excluded: the SEO layer adds nothing). */
  metaTitle: string;
  /** Meta description, 100 to 160 characters, different from the h1. */
  description: string;
  /** Publication date, YYYY-MM-DD. Set by the owner when approving. */
  date: string;
  author: { name: string };
  /** The buyer question the article answers; matches a topic in INSIGHTS_TOPICS. */
  topic: string;
  intro: PostBlock[];
  sections: PostSection[];
  /** True only after the owner has approved the post in writing. */
  approved: boolean;
  /** Notes for the owner: publish gate, inputs needed, links to check. Never rendered. */
  ownerReview: string[];
}

export const INSIGHTS_BASE_PATH = "/insights";
export const postPath = (slug: string) => `${INSIGHTS_BASE_PATH}/${slug}`;

/** "2026-12-01" -> "December 1, 2026", independent of the viewer's time zone. */
export const formatPostDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/** Any left-over owner marker. Matches the converted form and the original draft forms. */
export const PLACEHOLDER_PATTERN = /\[\s*(owner to confirm|owner:|verify link)/i;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const blockTexts = (b: PostBlock): string[] => {
  switch (b.kind) {
    case "p":
    case "h3":
    case "callout":
      return [b.text];
    case "ul":
    case "ol":
      return b.items;
    case "table":
      return [...b.header, ...b.rows.flat()];
  }
};

/** Every string a visitor or a crawler can receive for this post. `ownerReview` is excluded: it is never rendered. */
export function visibleText(post: BlogPost): string[] {
  return [
    post.title,
    post.metaTitle,
    post.description,
    post.author.name,
    ...post.intro.flatMap(blockTexts),
    ...post.sections.flatMap((s) => [...(s.heading ? [s.heading] : []), ...s.blocks.flatMap(blockTexts)]),
  ];
}

/** The owner markers still present in the visible text (empty = none). */
export const findPlaceholders = (post: BlogPost): string[] =>
  visibleText(post).filter((t) => PLACEHOLDER_PATTERN.test(t));

/** True when a callout block is present (an owner instruction, never public). */
const hasCallout = (post: BlogPost): boolean =>
  [...post.intro, ...post.sections.flatMap((s) => s.blocks)].some((b) => b.kind === "callout");

/**
 * The link policy for post bodies (security addendum 7, A7-2). Stricter than the chatbot's:
 *  - internal : a same-origin path with a single leading "/" (classifyHref rules: no "//host",
 *               no "/\host", no dot-segment or control-character tricks). Routed with <Link>.
 *  - external : an absolute URL written with an explicit https: scheme. http:, protocol-relative
 *               "//host" and backslash forms are refused, even though the chatbot accepts them.
 *  - text     : everything else (javascript:, data:, vbscript:, mailto:, tel:, http:, ...).
 *               Rendered as plain text, and the post cannot be published (`publishBlockers`).
 */
export function postLinkTarget(href: string): LinkTarget {
  const target = classifyHref(href);
  if (target.kind === "internal") return target;
  if (target.kind === "external" && /^https:\/\//i.test(href) && target.href.startsWith("https://")) return target;
  return { kind: "text" };
}

/** Why a post is not publishable (empty = it is). Used by tests and by the owner doc's checklist. */
export function publishBlockers(post: BlogPost): string[] {
  const out: string[] = [];
  if (!post.approved) out.push("not approved");
  if (findPlaceholders(post).length) out.push("an [Owner to confirm ...] marker is still in the text");
  if (hasCallout(post)) out.push("an owner callout is still in the body");
  if (!SLUG_PATTERN.test(post.slug)) out.push("invalid slug");
  if (!post.title.trim() || !post.metaTitle.trim() || !post.description.trim()) out.push("missing title or description");
  if (!ISO_DATE.test(post.date)) out.push("date is not YYYY-MM-DD");
  for (const href of linkTargets(post)) {
    if (postLinkTarget(href).kind === "text") out.push(`link target is not an internal path or an https URL: ${href}`);
  }
  return out;
}

export const isPublishable = (post: BlogPost): boolean => publishBlockers(post).length === 0;

/** The posts that may be public: publishable, with a unique slug (the first one wins). */
export function publishedPosts(posts: readonly (BlogPost | null | undefined)[]): BlogPost[] {
  const seen = new Set<string>();
  const out: BlogPost[] = [];
  for (const p of posts) {
    if (!p || !isPublishable(p) || seen.has(p.slug)) continue;
    seen.add(p.slug);
    out.push(p);
  }
  // Newest first; equal dates keep their list order.
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Every inline link target a reader could be given, used by the publish gate and the
 * "every internal link is a real route" test. Built from `parseInline`, the parser PostBody renders
 * with, so the gate checks exactly the hrefs that would be rendered (A8-1): a second regex could read
 * `](/ok[a](javascript:x)` as one internal link while the page renders `javascript:x`. It runs over
 * all visible text (body, list items, table cells, headings, callouts, title, descriptions), a
 * superset of what PostBody passes through InlineText today.
 */
export function linkTargets(post: BlogPost): string[] {
  return visibleText(post).flatMap((t) => parseInline(t).flatMap((n) => (n.type === "link" ? [n.href] : [])));
}

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "link"; text: string; href: string };

/** Splits body text into plain text, bold, italic and links. Not nested; anything else stays text. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) nodes.push({ type: "text", text: text.slice(last, at) });
    if (m[1] !== undefined) nodes.push({ type: "link", text: m[1], href: m[2] });
    else if (m[3] !== undefined) nodes.push({ type: "strong", text: m[3] });
    else nodes.push({ type: "em", text: m[4] });
    last = at + m[0].length;
  }
  if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
  return nodes;
}

/** The SEO fields for a post path, or null when the path is not a published post. */
export function postSeoFor(path: string, posts: readonly BlogPost[]): { title: string; description: string } | null {
  const post = posts.find((p) => postPath(p.slug) === path);
  return post ? { title: post.metaTitle, description: post.description } : null;
}
