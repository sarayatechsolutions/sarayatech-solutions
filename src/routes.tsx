import type { ReactElement } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Seo from "@/components/Seo";
import Index from "./pages/Index";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import FreeAudit from "./pages/FreeAudit";
import Realisation from "./pages/Realisation";
import Insights from "./pages/Insights";
import Careers from "./pages/Careers";
import NotFound from "./pages/NotFound";
import RouteAnnouncer from "@/components/RouteAnnouncer";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ServicePage from "./pages/services/ServicePage";
import ServicesIndex from "./pages/services/ServicesIndex";
import BlogPost from "./pages/BlogPost";
import IndustriesHub from "./pages/IndustriesHub";
import IndustryPage from "./pages/IndustryPage";
import AreaPage from "./pages/AreaPage";
import { SERVICE_PAGES, SERVICES_BASE_PATH, servicePath } from "@/content/services/services";
import { PRIVACY_PATH, TERMS_PATH } from "@/content/legal/legal";
import { WORK_PATH } from "@/content/work/work";
import { PUBLISHED_POSTS } from "@/content/insights/posts";
import { INDUSTRIES_BASE_PATH, PUBLISHED_INDUSTRIES } from "@/content/industries/industries";
import { LOCATIONS_BASE_PATH, PUBLISHED_AREAS } from "@/content/locations/locations";

export interface AppRoute {
  /** react-router path pattern. */
  path: string;
  element: ReactElement;
  /** For a pattern with a param: the values to prerender, one page each. */
  slugs?: () => string[];
  /** Param name filled by `slugs` (e.g. "slug" for /blog/:slug). */
  param?: string;
}

/**
 * The single list of public routes. The client router renders it and the build
 * prerenders it (src/entry-server.tsx -> tools/prerender.mjs), so a page can
 * not be routed without also being prerendered.
 *
 * /auth and /dashboard are intentionally not routed (STS-016); the page files are kept.
 *
 * STS-039 retired the enterprise-oriented /solutions, /solutions/:id, /industries and
 * /industry/:id pages: they are no longer routed, so they are neither prerendered nor in the
 * sitemap, and public/_redirects sends each old URL (301) to the closest live page. The page and
 * data files are kept. A path that comes back here must leave public/_redirects in the same
 * change (tests/redirects.test.mjs fails otherwise: Cloudflare applies a redirect before the page).
 */
export const APP_ROUTES: AppRoute[] = [
  { path: "/", element: <Index /> },
  { path: "/about", element: <About /> },
  // STS-033: packages and pricing (quote-based until the owner sets prices, C8).
  { path: "/pricing", element: <Pricing /> },
  { path: "/contact", element: <Contact /> },
  // STS-034: the free audit offer and its lead form.
  { path: "/free-audit", element: <FreeAudit /> },
  // STS-057: Our Work moved from /realisation (301 in public/_redirects).
  { path: WORK_PATH, element: <Realisation /> },
  { path: "/insights", element: <Insights /> },
  { path: "/careers", element: <Careers /> },
  // STS-039: the hub listing every service; it replaces the retired /solutions index.
  { path: SERVICES_BASE_PATH, element: <ServicesIndex /> },
  // STS-032: the five service pages.
  ...SERVICE_PAGES.map((page) => ({ path: servicePath(page.slug), element: <ServicePage page={page} /> })),
  // STS-037: legal drafts. Prerendered (HTTP 200) but noindex and out of the sitemap until C23.
  { path: PRIVACY_PATH, element: <Privacy /> },
  { path: TERMS_PATH, element: <Terms /> },
  // Owner-gated content (STS-055, STS-042, STS-043). Each group is spread in ONLY while its list has a
  // published entry, so with the lists as shipped (nothing approved) none of these paths is routed,
  // prerendered or in the sitemap, and a visit to one renders the 404 page. See docs/ops/owner-content.md.
  // STS-055: an article per approved post. /insights itself stays routed above.
  ...(PUBLISHED_POSTS.length > 0
    ? [{ path: "/insights/:slug", element: <BlogPost />, param: "slug", slugs: () => PUBLISHED_POSTS.map((p) => p.slug) }]
    : []),
  // STS-042: the hub and one page per listed industry. The hub replaces the /industries 301 in public/_redirects.
  ...(PUBLISHED_INDUSTRIES.length > 0
    ? [
        { path: INDUSTRIES_BASE_PATH, element: <IndustriesHub /> },
        { path: `${INDUSTRIES_BASE_PATH}/:slug`, element: <IndustryPage />, param: "slug", slugs: () => PUBLISHED_INDUSTRIES.map((e) => e.slug) },
      ]
    : []),
  // STS-043: one page per owner-confirmed suburb, at the matrix path /locations/<area> (REQ-033).
  ...(PUBLISHED_AREAS.length > 0
    ? [{ path: `${LOCATIONS_BASE_PATH}/:slug`, element: <AreaPage />, param: "slug", slugs: () => PUBLISHED_AREAS.map((e) => e.slug) }]
    : []),
];

/** Every concrete public URL path to prerender, dynamic detail pages expanded. */
export function getPublicPaths(): string[] {
  return APP_ROUTES.flatMap((r) =>
    r.slugs && r.param
      ? r.slugs().map((slug) => r.path.replace(`:${r.param}`, encodeURIComponent(slug)))
      : [r.path],
  );
}

export const AppRoutes = () => (
  <>
    <Seo />
    {/* FF-9: announces the new page's title and moves focus to its h1 on a route change. */}
    <RouteAnnouncer />
    <Routes>
    {APP_ROUTES.map((r) => (
      <Route key={r.path} path={r.path} element={<Layout>{r.element}</Layout>} />
    ))}
    {/* The catch-all stays last. */}
    <Route
      path="*"
      element={
        <Layout>
          <NotFound />
        </Layout>
      }
    />
    </Routes>
  </>
);
