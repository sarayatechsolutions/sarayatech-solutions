// Per-route SEO data and the head tags built from it (STS-021). Pure TypeScript, no React:
// it is imported by the SSR bundle (tools/prerender.mjs writes the tags into each page's
// <head>), by the client <Seo /> component (document.title on navigation) and by tests.
//
// Copy rules: describe only what the page contains. No price, statistic, review, client
// name or founding year. Business name follows the C1 fallback ("SarayaTech Solutions").

/**
 * Canonical host (B2 is OPEN; documented fallback = apex, no www). Overridable at build time
 * with VITE_SITE_URL. Kept here, not in src/config/, until the business config lands and the
 * two can be unified.
 */
export const DEFAULT_SITE_URL = "https://sarayatechsolutions.com";

/** Strips whitespace and trailing slashes, so `${SITE_URL}${path}` never has a double slash. */
export function normalizeSiteUrl(raw: string | undefined | null): string {
  const v = (raw ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+$/i.test(v) ? v : DEFAULT_SITE_URL;
}

export const SITE_URL = normalizeSiteUrl(import.meta.env?.VITE_SITE_URL as string | undefined);

export const SITE_NAME = "SarayaTech Solutions";
/** Shared social image: the only brand image in public/. Replace with a 1200x630 card when one exists. */
export const OG_IMAGE_PATH = "/logo.png";

export interface SeoData {
  title: string;
  description: string;
  /** Normalized URL path this data is for (no trailing slash except "/"). */
  path: string;
  /** True for pages that must not be indexed (the 404 page). */
  noindex?: boolean;
}

export const NOT_FOUND_SEO_PATH = "/__not-found__";

const STATIC_SEO: Record<string, { title: string; description: string }> = {
  "/": {
    title: "SarayaTech Solutions | Columbus, OH Digital Agency",
    description:
      // STS-039: names the five live services; cloud, data and AI pages are retired (REQ-014).
      "SarayaTech Solutions is a Columbus, Ohio digital agency for websites, apps, local SEO, social media and ads. See our services, recent work and how to start.",
  },
  "/about": {
    // STS-036: written for the click and different from the page's h1 ("Your neighbors in tech").
    title: "About SarayaTech | Columbus Small Business Web & Marketing",
    description:
      "Meet the SarayaTech team behind websites, apps and local marketing for Columbus small businesses. See how we work, then book a free consultation.",
  },
  "/contact": {
    title: "Contact SarayaTech Solutions | Columbus, Ohio",
    description:
      "Start a conversation with SarayaTech Solutions in Columbus, Ohio. Send a message through our contact form and tell us about your project.",
  },
  "/free-audit": {
    // STS-034: the offer name is the h1; the title adds the place and the brand (<=60 chars).
    title: "Free Website & Google Audit in Columbus | SarayaTech",
    description:
      "Get a free look at your website and Google profile from SarayaTech. We'll show you three quick wins for your Columbus business, whether you hire us or not.",
  },
  "/realisation": {
    title: "Websites and Apps We Have Built | SarayaTech Solutions",
    description:
      "Four websites and apps built by SarayaTech Solutions in Columbus, Ohio: what each one is, what we built, and a link to see it live.",
  },
  "/insights": {
    title: "Insights and Resources | SarayaTech Solutions",
    description:
      "Insights and resources from SarayaTech Solutions, a Columbus, Ohio digital agency, on web, software, cloud, data and AI topics.",
  },
  "/careers": {
    title: "Careers at SarayaTech Solutions | Columbus, OH",
    description:
      "Join the SarayaTech Solutions team in Columbus, Ohio. See how we work and how to get in touch about working with a digital agency team.",
  },
  // STS-039: the hub that replaced the retired /solutions index. The retired /solutions/*,
  // /industries and /industry/* paths have no entry: they are 301s now (public/_redirects), and a
  // client-side visit to one renders the 404 page, which must carry the noindex data.
  "/services": {
    title: "Websites, Apps & Marketing in Columbus, OH | SarayaTech",
    description:
      "Website design, app development, local SEO, social media and paid ads for Columbus small businesses. Pick a service to see what's included.",
  },
  // STS-032 service pages. Each title carries the page's keyword from the keyword map
  // (08-MARKETING-OPERATIONS.md section 7, REQ-078); each description differs from the page's h1.
  "/services/website-design": {
    title: "Small Business Website Design in Columbus, OH | SarayaTech",
    description:
      "Mobile-friendly websites for Columbus small businesses, built to turn visitors into calls and bookings. See what's included, then book a free consultation.",
  },
  "/services/app-development": {
    title: "App & Custom Software Developer in Columbus, OH | SarayaTech",
    description:
      "Booking systems, customer portals and mobile apps for Columbus small businesses. See how a project works, from scoping to support, and ask for a quote.",
  },
  "/services/local-seo": {
    title: "Local SEO & Google Visibility in Columbus, OH | SarayaTech",
    description:
      "Help nearby customers find you: Google Business Profile setup, local SEO and a simple monthly report for Columbus small businesses. Book a consultation.",
  },
  "/services/social-media-marketing": {
    title: "Social Media Marketing in Columbus, OH | SarayaTech",
    description:
      "Social media for Columbus small businesses, planned, posted and reported every month. You always own your accounts. Book a free consultation to start.",
  },
  "/services/paid-ads": {
    title: "Google & Meta Ads Management in Columbus, OH | SarayaTech",
    description:
      "Google and Meta ads for Columbus small businesses, with tracking on every call and form. Your ad spend stays separate from our management fee.",
  },
};

const NOT_FOUND_SEO = {
  title: "Page Not Found | SarayaTech Solutions",
  description: "The page you were looking for could not be found. Return to the SarayaTech Solutions home page.",
};

/** Request path -> "/about", "/services/x"; drops query, hash and trailing slashes. */
export function normalizePath(path: string): string {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return p === "" ? "/" : p.startsWith("/") ? p : `/${p}`;
}

/** SEO data for a URL path. Unknown paths get the 404 data (noindex, no canonical). */
export function getSeo(rawPath: string): SeoData {
  const path = normalizePath(rawPath);
  const hit = STATIC_SEO[path];
  if (!hit) return { ...NOT_FOUND_SEO, path: NOT_FOUND_SEO_PATH, noindex: true };
  return { ...hit, path };
}

export const canonicalUrl = (path: string, siteUrl: string = SITE_URL): string => `${siteUrl}${normalizePath(path)}`;

export interface HeadTag {
  tag: "title" | "meta" | "link";
  /** Stable identity: the client replaces the tag with this key instead of appending. */
  key: string;
  attrs: Record<string, string>;
  /** Text content (title only). */
  text?: string;
}

/** Keys of every head tag this module can own; the client removes the ones a page lacks. */
export const OWNED_KEYS = [
  "description",
  "robots",
  "canonical",
  "og:type",
  "og:site_name",
  "og:title",
  "og:description",
  "og:url",
  "og:image",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
] as const;

/** Every head tag this module owns for a page, in output order. */
export function buildHeadTags(seo: SeoData, siteUrl: string = SITE_URL): HeadTag[] {
  const meta = (key: string, attr: "name" | "property", content: string): HeadTag => ({
    tag: "meta",
    key,
    attrs: { [attr]: key, content },
  });
  const tags: HeadTag[] = [
    { tag: "title", key: "title", attrs: {}, text: seo.title },
    meta("description", "name", seo.description),
  ];
  if (seo.noindex) {
    tags.push(meta("robots", "name", "noindex, follow"));
    return tags;
  }
  const url = canonicalUrl(seo.path, siteUrl);
  const image = `${siteUrl}${OG_IMAGE_PATH}`;
  tags.push(
    { tag: "link", key: "canonical", attrs: { rel: "canonical", href: url } },
    meta("og:type", "property", "website"),
    meta("og:site_name", "property", SITE_NAME),
    meta("og:title", "property", seo.title),
    meta("og:description", "property", seo.description),
    meta("og:url", "property", url),
    meta("og:image", "property", image),
    meta("twitter:card", "name", "summary"),
    meta("twitter:title", "name", seo.title),
    meta("twitter:description", "name", seo.description),
    meta("twitter:image", "name", image),
  );
  return tags;
}

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The tags as an HTML string for the prerendered <head>. */
export function renderHeadTags(seo: SeoData, siteUrl: string = SITE_URL): string {
  return buildHeadTags(seo, siteUrl)
    .map((t) =>
      t.tag === "title"
        ? `<title>${escapeHtml(t.text ?? "")}</title>`
        : `<${t.tag} ${Object.entries(t.attrs)
            .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
            .join(" ")} />`,
    )
    .join("\n    ");
}

/** sitemap.xml for the given URL paths, absolute on the canonical host. */
export function buildSitemapXml(paths: string[], siteUrl: string = SITE_URL, lastmod?: string): string {
  const urls = paths
    .map((p) => `  <url><loc>${escapeHtml(canonicalUrl(p, siteUrl))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
