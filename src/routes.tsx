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
import ServicePage from "./pages/services/ServicePage";
import ServicesIndex from "./pages/services/ServicesIndex";
import { SERVICE_PAGES, SERVICES_BASE_PATH, servicePath } from "@/content/services/services";

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
  { path: "/realisation", element: <Realisation /> },
  { path: "/insights", element: <Insights /> },
  { path: "/careers", element: <Careers /> },
  // STS-039: the hub listing every service; it replaces the retired /solutions index.
  { path: SERVICES_BASE_PATH, element: <ServicesIndex /> },
  // STS-032: the five service pages.
  ...SERVICE_PAGES.map((page) => ({ path: servicePath(page.slug), element: <ServicePage page={page} /> })),
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
