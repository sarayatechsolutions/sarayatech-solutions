import type { ReactElement } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Seo from "@/components/Seo";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Solutions from "./pages/Solutions";
import Realisation from "./pages/Realisation";
import Insights from "./pages/Insights";
import SolutionDetails from "./pages/SolutionDetails";
import Industries from "./pages/Industries";
import IndustryDetails from "./pages/IndustryDetails";
import Careers from "./pages/Careers";
import NotFound from "./pages/NotFound";
import { SOLUTIONS_DATA } from "@/constants/solutions";
import { industries } from "@/constants/industries";

export interface AppRoute {
  /** react-router path pattern. */
  path: string;
  element: ReactElement;
  /** For a pattern with a param: the values to prerender, one page each. */
  slugs?: () => string[];
  /** Param name filled by `slugs` (e.g. "solutionId" for /solutions/:solutionId). */
  param?: string;
}

/**
 * The single list of public routes. The client router renders it and the build
 * prerenders it (src/entry-server.tsx -> tools/prerender.mjs), so a page can
 * not be routed without also being prerendered.
 *
 * /auth and /dashboard are intentionally not routed (STS-016); the page files are kept.
 */
export const APP_ROUTES: AppRoute[] = [
  { path: "/", element: <Index /> },
  { path: "/about", element: <About /> },
  { path: "/contact", element: <Contact /> },
  { path: "/solutions", element: <Solutions /> },
  {
    path: "/solutions/:solutionId",
    element: <SolutionDetails />,
    param: "solutionId",
    slugs: () => Object.keys(SOLUTIONS_DATA),
  },
  { path: "/industries", element: <Industries /> },
  {
    path: "/industry/:industryId",
    element: <IndustryDetails />,
    param: "industryId",
    slugs: () => industries.map((i) => i.id),
  },
  { path: "/realisation", element: <Realisation /> },
  { path: "/insights", element: <Insights /> },
  { path: "/careers", element: <Careers /> },
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
