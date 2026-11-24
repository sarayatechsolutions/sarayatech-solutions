// Build-time prerender (STS-020). Runs after the client build and the SSR build:
//
//   vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr && node tools/prerender.mjs
//
// For every public route it renders the app to HTML with the SSR bundle and writes
// dist/<route>/index.html from the client's dist/index.html shell, plus dist/404.html.
// Cloudflare Pages serves a file at /about/ or /about, and 404.html for unknown URLs.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT_MARKER = '<div id="root"></div>';

// Head tags a page's SEO data owns (STS-021). The shell's generic copies are removed before
// the per-route ones are written, so a page never carries two titles or two canonicals.
const OWNED_META = /<meta\b(?=[^>]*\b(?:name|property)=["'](?:description|robots|og:[\w:]+|twitter:[\w:]+)["'])[^>]*>\s*/gi;
const OWNED_CANONICAL = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>\s*/gi;
const OWNED_TITLE = /<title\b[^>]*>[\s\S]*?<\/title>\s*/gi;

/** Replaces the shell's title/description/canonical/OG/Twitter tags with `headHtml`, just before </head>. */
export function injectHead(template, headHtml) {
  if (!template.includes("</head>")) throw new Error("index.html has no </head>; cannot inject SEO tags");
  const stripped = template.replace(OWNED_TITLE, "").replace(OWNED_META, "").replace(OWNED_CANONICAL, "");
  return stripped.replace("</head>", () => `  ${headHtml}
  </head>`);
}

/**
 * Inserts rendered markup into the shell's empty root, and (when given) the page's SEO head tags.
 * Throws if the shell has no empty root.
 */
export function inject(template, appHtml, headHtml) {
  if (!template.includes(ROOT_MARKER)) {
    throw new Error(`index.html has no ${ROOT_MARKER}; cannot inject prerendered markup`);
  }
  const withRoot = template.replace(ROOT_MARKER, () => `<div id="root">${appHtml}</div>`);
  return headHtml === undefined ? withRoot : injectHead(withRoot, headHtml);
}

/** Keeps robots.txt's Sitemap line on the canonical host (VITE_SITE_URL may differ from the committed fallback). */
export function withSitemapLine(robotsTxt, siteUrl) {
  const line = `Sitemap: ${siteUrl}/sitemap.xml`;
  const kept = robotsTxt.replace(/^\s*Sitemap:.*(?:\r?\n|$)/gim, "").replace(/\s*$/, "");
  return `${kept}

${line}
`;
}

/** dist-relative output file for a URL path: "/" -> index.html, "/about" -> about/index.html. */
export function outputFile(urlPath) {
  const clean = urlPath.replace(/^\/+|\/+$/g, "");
  return clean ? `${clean}/index.html` : "index.html";
}

export async function prerender({ distDir, serverEntry }) {
  const shellPath = join(distDir, "index.html");
  if (!existsSync(shellPath)) throw new Error(`${shellPath} not found: run the client build first`);
  if (!existsSync(serverEntry)) throw new Error(`${serverEntry} not found: run the SSR build first`);

  const template = readFileSync(shellPath, "utf8");
  const entry = await import(/* @vite-ignore */ pathToFileURL(serverEntry).href);
  const { render, paths, NOT_FOUND_PATH, getSeo, renderHeadTags, buildSitemapXml, SITE_URL } = entry;
  if (!getSeo || !renderHeadTags || !buildSitemapXml) throw new Error("the SSR entry exports no SEO helpers (src/seo/seo.ts)");
  if (!paths?.length) throw new Error("the SSR entry exported no paths; refusing to prerender nothing");

  const written = [];
  const write = (rel, html) => {
    const file = join(distDir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
    written.push(rel);
  };

  for (const urlPath of paths) {
    write(outputFile(urlPath), inject(template, render(urlPath), renderHeadTags(getSeo(urlPath))));
  }
  write("404.html", inject(template, render(NOT_FOUND_PATH), renderHeadTags(getSeo(NOT_FOUND_PATH))));

  // Sitemap: exactly the prerendered public paths, on the canonical host. lastmod is the build date.
  write("sitemap.xml", buildSitemapXml(paths, SITE_URL, new Date().toISOString().slice(0, 10)));
  const robotsPath = join(distDir, "robots.txt");
  if (existsSync(robotsPath)) write("robots.txt", withSitemapLine(readFileSync(robotsPath, "utf8"), SITE_URL));
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  prerender({
    distDir: join(ROOT, "dist"),
    serverEntry: join(ROOT, "dist-ssr", "entry-server.js"),
  })
    .then((files) => {
      console.log(`prerendered ${files.length} page(s):`);
      for (const f of files) console.log(`  dist/${f}`);
    })
    .catch((err) => {
      console.error(`prerender failed: ${err.stack || err}`);
      process.exit(1);
    });
}
