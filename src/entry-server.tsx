import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { AppProviders } from "./App";
import { AppRoutes, getPublicPaths } from "./routes";

/** URL paths the build prerenders (see tools/prerender.mjs). */
export const paths = getPublicPaths();

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
