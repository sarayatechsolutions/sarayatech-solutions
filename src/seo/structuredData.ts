// JSON-LD structured data (STS-024, REQ-042, 07-ANALYTICS-AND-SEO.md section 3.6). Pure TypeScript,
// no React: the SSR entry writes it into each prerendered page's <head> (tools/prerender.mjs) and
// the client <Seo /> component keeps it in step after a client-side navigation.
//
// FACT RULES
//  - Every business fact comes from src/config/business.ts (the single NAP record, STS-030), read
//    through its helpers. A null or unverified field is OMITTED, never filled with a placeholder.
//  - Never `aggregateRating` and never `review`: C14 is open, and Google's guidelines bar
//    self-serving review markup for a business's own entity even once real reviews exist (08 s.17).
//    The visible trust line is where a real rating goes.
//  - No priceRange, foundingDate, founder, numberOfEmployees, award or certification property:
//    C7, C8 and C21 have supplied none of them.
//  - The organisation node is on "/" only. Inner pages carry a BreadcrumbList; service pages add a
//    Service whose provider is a reference (name, url, @id), not a second full organisation.
//  - noindex pages (/insights, the legal drafts) get a breadcrumb at most; the 404 page gets nothing.

import {
  BUSINESS,
  hasAddress,
  hasEmail,
  socialLinks,
  verifiedPhoneE164,
} from "../config/business";
import { SERVICE_PAGES, servicePath, SERVICES_BASE_PATH } from "../content/services/services";
import { PRIVACY_PATH, TERMS_PATH } from "../content/legal/legal";
import { WORK_PATH } from "../content/work/work";
import { INSIGHTS_BASE_PATH, postPath, type BlogPost } from "../content/insights/blog";
import { PUBLISHED_POSTS } from "../content/insights/posts";
import { INDUSTRIES_BASE_PATH, INDUSTRIES_HUB, industryPath, PUBLISHED_INDUSTRIES } from "../content/industries/industries";
import { areaPath, PUBLISHED_AREAS } from "../content/locations/locations";
import { OG_IMAGE_PATH, SITE_URL, canonicalUrl, getSeo, normalizePath, NOT_FOUND_SEO_PATH } from "./seo";

/** The slice of the business config the schema reads. `config` is a test seam; production uses BUSINESS. */
export interface SchemaConfig {
  name: string;
  phone: null | { display: string; tel: string; acceptsTexts?: boolean };
  email: null | string;
  address: null | { lines: readonly string[]; mapEmbedUrl?: string };
  areas: readonly string[];
  hours: null | readonly string[];
  booking: { url: string; verified: boolean };
  social: null | Record<string, string | undefined>;
}

type JsonLd = Record<string, unknown>;

const SCHEMA_CONTEXT = "https://schema.org";

/** Stable node id, so the Service provider points at the same entity the home page declares. */
export const organizationId = (siteUrl: string = SITE_URL) => `${siteUrl}/#organization`;
export const websiteId = (siteUrl: string = SITE_URL) => `${siteUrl}/#website`;

/** Last breadcrumb label for each inner page. A route with no label here gets no breadcrumb. */
export const BREADCRUMB_LABELS: Record<string, string> = {
  "/about": "About",
  "/pricing": "Pricing",
  "/contact": "Contact",
  "/free-audit": "Free Audit",
  [WORK_PATH]: "Our Work",
  "/insights": "Insights",
  "/careers": "Careers",
  [SERVICES_BASE_PATH]: "Services",
  ...Object.fromEntries(SERVICE_PAGES.map((p) => [servicePath(p.slug), p.navLabel])),
  [PRIVACY_PATH]: "Privacy Policy",
  [TERMS_PATH]: "Terms of Use",
  // STS-042: the industries hub exists only while an industry page is published.
  ...(PUBLISHED_INDUSTRIES.length > 0 ? { [INDUSTRIES_BASE_PATH]: INDUSTRIES_HUB.breadcrumbLabel } : {}),
};

/**
 * Breadcrumb trail (after Home) for an owner-gated page, or null for any other path. Labels come
 * from the published entries only, so an unpublished page gets no trail.
 */
function gatedTrail(path: string): [string, string][] | null {
  const post = PUBLISHED_POSTS.find((p) => postPath(p.slug) === path);
  if (post) return [[BREADCRUMB_LABELS[INSIGHTS_BASE_PATH], INSIGHTS_BASE_PATH], [post.title, path]];
  const industry = PUBLISHED_INDUSTRIES.find((e) => industryPath(e.slug) === path);
  if (industry) return [[INDUSTRIES_HUB.breadcrumbLabel, INDUSTRIES_BASE_PATH], [industry.name, path]];
  const area = PUBLISHED_AREAS.find((e) => areaPath(e.slug) === path);
  if (area) return [[area.name, path]];
  return null;
}

/**
 * schema.org `openingHours` form ("Mo-Fr 09:00-17:00"). The config's C6 strings are display text;
 * only an entry already in this form is emitted, so display copy never becomes invalid schema.
 */
const OPENING_HOURS = /^(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?(,(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?)* \d{2}:\d{2}-\d{2}:\d{2}$/;

const httpsOnly = (url: string) => /^https:\/\/[^\s"<>]+$/.test(url);

/**
 * The business entity for "/". Plain `Organization` while there is no verified street address:
 * Google's LocalBusiness (and so ProfessionalService) markup requires `address`, and service-area
 * mode (C4 fallback) must not carry one. Once C4 supplies an address the node becomes
 * `["Organization", "ProfessionalService"]` with no other change.
 */
export function buildOrganization(config: SchemaConfig = BUSINESS, siteUrl: string = SITE_URL): JsonLd {
  const local = hasAddress(config);
  const node: JsonLd = {
    "@type": local ? ["Organization", "ProfessionalService"] : "Organization",
    "@id": organizationId(siteUrl),
    name: config.name,
    url: `${siteUrl}/`,
    logo: `${siteUrl}${OG_IMAGE_PATH}`,
  };
  if (local) node.image = `${siteUrl}${OG_IMAGE_PATH}`;
  const description = getSeo("/").description;
  if (description) node.description = description;

  const tel = verifiedPhoneE164(config);
  if (tel) node.telephone = tel;
  if (hasEmail(config) && config.email) node.email = config.email;
  if (local && config.address) {
    // C4 supplies display lines, not structured fields; they are published as one street line
    // rather than guessed into locality/region/postcode.
    node.address = { "@type": "PostalAddress", streetAddress: config.address.lines.join(", ") };
  }
  const areas = config.areas.filter((a) => a.trim().length > 0);
  if (areas.length) node.areaServed = areas.map((name) => ({ "@type": "City", name }));
  const hours = (config.hours ?? []).filter((h) => OPENING_HOURS.test(h));
  if (local && hours.length) node.openingHours = hours;
  const sameAs = socialLinks(config).map(([, url]) => url).filter(httpsOnly);
  if (sameAs.length) node.sameAs = sameAs;
  return node;
}

/** The WebSite node for "/", published by the organisation. */
export function buildWebSite(config: SchemaConfig = BUSINESS, siteUrl: string = SITE_URL): JsonLd {
  return {
    "@type": "WebSite",
    "@id": websiteId(siteUrl),
    name: config.name,
    url: `${siteUrl}/`,
    publisher: { "@id": organizationId(siteUrl) },
  };
}

/** Home > [Services >] Page, absolute on the canonical host. Null for "/" and unlabelled paths. */
export function buildBreadcrumb(rawPath: string, siteUrl: string = SITE_URL): JsonLd | null {
  const path = normalizePath(rawPath);
  const gated = gatedTrail(path);
  const label = BREADCRUMB_LABELS[path];
  if (path === "/" || (!label && !gated)) return null;
  const trail: [string, string][] = [["Home", "/"]];
  if (gated) trail.push(...gated);
  else {
    if (path.startsWith(`${SERVICES_BASE_PATH}/`)) trail.push([BREADCRUMB_LABELS[SERVICES_BASE_PATH], SERVICES_BASE_PATH]);
    trail.push([label, path]);
  }
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, p], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: canonicalUrl(p, siteUrl),
    })),
  };
}

/** A Service for one of the five service pages, or null for any other path. */
export function buildService(rawPath: string, config: SchemaConfig = BUSINESS, siteUrl: string = SITE_URL): JsonLd | null {
  const path = normalizePath(rawPath);
  const page = SERVICE_PAGES.find((p) => servicePath(p.slug) === path);
  if (!page) return null;
  const node: JsonLd = {
    "@type": "Service",
    name: page.navLabel,
    serviceType: page.navLabel,
    description: getSeo(path).description,
    url: canonicalUrl(path, siteUrl),
    provider: { "@type": "Organization", "@id": organizationId(siteUrl), name: config.name, url: `${siteUrl}/` },
  };
  const areas = config.areas.filter((a) => a.trim().length > 0);
  if (areas.length) node.areaServed = areas.map((name) => ({ "@type": "City", name }));
  return node;
}

/**
 * Article for a published blog post (STS-055), or null for any other path. Only fields the post
 * holds: no rating, review or word count. The author and publisher are nested references to the
 * business, never a second top-level organisation declaration (that stays on "/" only).
 */
export function buildArticle(rawPath: string, config: SchemaConfig = BUSINESS, siteUrl: string = SITE_URL, posts: readonly BlogPost[] = PUBLISHED_POSTS): JsonLd | null {
  const path = normalizePath(rawPath);
  const post = posts.find((p) => postPath(p.slug) === path);
  if (!post) return null;
  const business = { "@type": "Organization", "@id": organizationId(siteUrl), name: config.name, url: `${siteUrl}/` };
  return {
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: canonicalUrl(path, siteUrl),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl(path, siteUrl) },
    image: [`${siteUrl}${OG_IMAGE_PATH}`],
    author: post.author.name === config.name ? business : { "@type": "Organization", name: post.author.name },
    publisher: business,
  };
}

/** Every JSON-LD document for a URL path, in output order. Empty for the 404 page and unknown paths. */
export function buildJsonLd(rawPath: string, config: SchemaConfig = BUSINESS, siteUrl: string = SITE_URL): JsonLd[] {
  const seo = getSeo(rawPath);
  if (seo.path === NOT_FOUND_SEO_PATH) return [];
  const path = seo.path;
  const withContext = (node: JsonLd): JsonLd => ({ "@context": SCHEMA_CONTEXT, ...node });

  if (seo.noindex) {
    const crumb = buildBreadcrumb(path, siteUrl);
    return crumb ? [withContext(crumb)] : [];
  }
  if (path === "/") {
    return [withContext({ "@graph": [buildOrganization(config, siteUrl), buildWebSite(config, siteUrl)] })];
  }
  const out: JsonLd[] = [];
  const service = buildService(path, config, siteUrl);
  if (service) out.push(withContext(service));
  const article = buildArticle(path, config, siteUrl);
  if (article) out.push(withContext(article));
  const crumb = buildBreadcrumb(path, siteUrl);
  if (crumb) out.push(withContext(crumb));
  return out;
}

/**
 * JSON for inside a <script> element. JSON.stringify alone is not enough: a value containing
 * "</script>" or "<!--" would end the element early. Escaping <, > and & as \u sequences (and the
 * two line separators JavaScript treats as newlines) keeps the text valid JSON that parses back to
 * the same value, with no way to break out of the element.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Attribute that marks the script elements this module owns (the client replaces only these). */
export const JSON_LD_ATTR = "data-seo-jsonld";

/** The page's JSON-LD as <script> elements for the prerendered <head>. Empty string when there is none. */
export function renderJsonLd(rawPath: string, config: SchemaConfig = BUSINESS, siteUrl: string = SITE_URL): string {
  return buildJsonLd(rawPath, config, siteUrl)
    .map((doc) => `<script type="application/ld+json" ${JSON_LD_ATTR}>${serializeJsonLd(doc)}</script>`)
    .join("\n    ");
}
