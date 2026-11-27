import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { AppProviders } from "./App";
import { AppRoutes, getPublicPaths } from "./routes";
import { getSeo } from "./seo/seo";

/** URL paths the build prerenders (see tools/prerender.mjs). */
export const paths = getPublicPaths();

/** Paths listed in sitemap.xml: the prerendered ones minus noindex pages (STS-037 legal drafts). */
export const sitemapPaths = paths.filter((p) => !getSeo(p).noindex);

/** Path rendered into dist/404.html: it matches no route, so the catch-all renders. */
export const NOT_FOUND_PATH = "/__not-found__";

/** Renders the app body for one URL to an HTML string. */
export function render(url: string): string {
  return renderToString(
    <AppProviders>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </AppProviders>,
  );
}

/** SEO helpers for tools/prerender.mjs (STS-021). */
export { SITE_URL, NOT_FOUND_SEO_PATH, getSeo, renderHeadTags, buildSitemapXml } from "./seo/seo";

/** JSON-LD structured data for tools/prerender.mjs (STS-024). */
export { renderJsonLd } from "./seo/structuredData";
