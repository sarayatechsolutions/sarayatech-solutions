#!/usr/bin/env node
// Smoke test for the BUILT site, served by `vite preview` (see vantry.yml run.smoke).
//
//   node tests/smoke/smoke.mjs http://localhost:4173
//
// No browser: Node's fetch requests every public route and asserts the response is
// the prerendered page, then the build output in dist/assets is scanned for leaked secrets.
//
// Every route carries `expectH1`: the served HTML (prerendered at build time, STS-020)
// must contain that page's real <h1>, not an empty root.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");

/** Every `{ id, <field> }` pair of a JSON array file under data/, so routes follow the content. */
function jsonItems(relPath, field) {
  const items = JSON.parse(readFileSync(join(ROOT, relPath), "utf8"));
  const out = (Array.isArray(items) ? items : []).filter((x) => x && x.id && x[field]).map((x) => ({ id: x.id, text: x[field] }));
  if (!out.length) throw new Error(`no item with id and ${field} in ${relPath}`);
  return out;
}

/** Every industry `id` + `name` in the TS constants file (it is not importable from plain Node). */
function tsIndustries(relPath) {
  const src = readFileSync(join(ROOT, relPath), "utf8");
  const out = [...src.matchAll(/\bid:\s*["']([^"']+)["'][\s\S]*?\bname:\s*["']([^"']+)["']/g)].map((m) => ({ id: m[1], text: m[2] }));
  if (!out.length) throw new Error(`no industries found in ${relPath}`);
  return out;
}

/** Visible text of the first <h1>: tags removed, entities decoded, whitespace collapsed. */
export function firstH1Text(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!m) return null;
  return m[1]
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Public routes: every path src/routes.tsx prerenders (STS-020), each with the page's
 * real <h1> text, so an empty client-rendered shell fails. A unit test keeps this list
 * in step with getPublicPaths().
 * @type {{ path: string, expectH1?: string, expectText?: string, contentType?: string, shell?: boolean }[]}
 */
export function buildRoutes() {
  return [
    { path: "/", expectH1: "Your Partner for Digital Transformation & AI Innovation" },
    { path: "/about", expectH1: "Building Digital Solutions that Make a Difference" },
    { path: "/contact", expectH1: "Let's Start a Conversation" },
    { path: "/solutions", expectH1: "Our Services" },
    ...jsonItems("data/solutions.json", "title").map(({ id, text }) => ({
      path: `/solutions/${id}`,
      expectH1: text,
      // Tabbed content is in the HTML (hidden panels), not only behind a click.
      expectText: "Technical Specifications",
    })),
    { path: "/industries", expectH1: "Industry-Leading Solutions for Every Sector" },
    ...tsIndustries("src/constants/industries.ts").map(({ id, text }) => ({ path: `/industry/${id}`, expectH1: text })),
    { path: "/realisation", expectH1: "Recent Realisations" },
    { path: "/insights", expectH1: "Insights & Resources" },
    { path: "/careers", expectH1: "Join Our Team" },
    { path: "/404.html", expectH1: "404" },
    { path: "/robots.txt", shell: false, expectText: "User-agent", contentType: "text/plain" },
  ];
}

// framer-motion writes an `initial` of opacity 0 into the HTML (STS-022).
const HIDDEN_AT_FIRST_PAINT = /style="[^"]*opacity:\s*0[;"]/;

/** Canonical host: VITE_SITE_URL at build time, else the documented fallback (B2). Mirrors src/seo/seo.ts, kept equal by a unit test. */
export const DEFAULT_SITE_URL = "https://sarayatechsolutions.com";
export function siteUrlFromEnv(env = process.env) {
  const v = (env.VITE_SITE_URL || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+$/i.test(v) ? v : DEFAULT_SITE_URL;
}

const decodeEntities = (t) =>
  t.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");

/** Reads the SEO head of a served page: title count/text, description, canonical hrefs. */
export function readSeoHead(html) {
  const head = (/<head[\s\S]*?<\/head>/i.exec(html) || [""])[0];
  const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decodeEntities(m[1]).trim());
  const descriptions = [...head.matchAll(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/gi)].map((m) => {
    const c = /\bcontent="([^"]*)"/i.exec(m[0]);
    return c ? decodeEntities(c[1]).trim() : "";
  });
  const canonicals = [...head.matchAll(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi)].map((m) => {
    const h = /\bhref="([^"]*)"/i.exec(m[0]);
    return h ? h[1] : "";
  });
  return { titles, descriptions, canonicals };
}

/** STS-021: exactly one title, a non-empty description, one canonical equal to the route's absolute URL. */
export function checkSeoHead(html, expectedCanonical) {
  const { titles, descriptions, canonicals } = readSeoHead(html);
  const errors = [];
  if (titles.length !== 1) errors.push(`expected exactly one <title>, found ${titles.length}`);
  else if (!titles[0]) errors.push("empty <title>");
  if (descriptions.length !== 1) errors.push(`expected exactly one meta description, found ${descriptions.length}`);
  else if (!descriptions[0]) errors.push("empty meta description");
  if (canonicals.length !== 1) errors.push(`expected exactly one canonical, found ${canonicals.length}`);
  else if (canonicals[0] !== expectedCanonical) errors.push(`canonical ${canonicals[0]} is not ${expectedCanonical}`);
  return errors;
}

/** Titles and descriptions must be unique across pages. `pages` is [{ path, title, description }]. */
export function findDuplicateSeo(pages) {
  const out = [];
  for (const field of ["title", "description"]) {
    const seen = new Map();
    for (const pg of pages) {
      if (seen.has(pg[field])) out.push(`duplicate ${field} on ${seen.get(pg[field])} and ${pg.path}`);
      else seen.set(pg[field], pg.path);
    }
  }
  return out;
}

/** <loc> values of a sitemap.xml. */
export function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decodeEntities(m[1]));
}

// "sk-" as a token (not the tail of e.g. "task-"), then 20+ key characters.
export const SECRET_PATTERNS = [
  { name: "OpenAI-style secret key", re: /(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: "dangerouslyAllowBrowser", re: /dangerouslyAllowBrowser/ },
];

/** Returns one finding per pattern that matches `text`. Never echoes the secret itself. */
export function findSecretLeaks(text) {
  return SECRET_PATTERNS.filter(({ re }) => re.test(text)).map(({ name }) => name);
}

export function checkRouteBody(route, status, contentType, body) {
  const errors = [];
  if (status !== 200) errors.push(`expected HTTP 200, got ${status}`);
  if (route.shell !== false && !body.includes('<div id="root">')) {
    errors.push('missing <div id="root">');
  }
  if (route.contentType && !(contentType || "").includes(route.contentType)) {
    errors.push(`expected content-type ${route.contentType}, got ${contentType || "none"}`);
  }
  if (route.expectH1 !== undefined) {
    const h1 = firstH1Text(body);
    if (h1 === null) errors.push("no <h1> in the served HTML (empty client-rendered shell?)");
    else if (h1 !== route.expectH1) errors.push(`expected <h1> ${JSON.stringify(route.expectH1)}, got ${JSON.stringify(h1)}`);
  }
  if (route.expectH1 !== undefined && HIDDEN_AT_FIRST_PAINT.test(body)) {
    errors.push("an element is served hidden (inline opacity:0), so no-JS visitors and crawlers see a blank section");
  }
  if (route.expectText && !body.includes(route.expectText)) {
    errors.push(`missing expected text ${JSON.stringify(route.expectText)}`);
  }
  return errors;
}

async function checkRoutes(baseUrl) {
  const failures = [];
  const routes = buildRoutes();
  const siteUrl = siteUrlFromEnv();
  const seoPages = [];
  for (const route of routes) {
    const url = new URL(route.path, baseUrl).toString();
    try {
      const res = await fetch(url, { redirect: "manual" });
      const body = await res.text();
      const errors = checkRouteBody(route, res.status, res.headers.get("content-type"), body);
      if (route.expectH1 !== undefined && route.path !== "/404.html") {
        errors.push(...checkSeoHead(body, `${siteUrl}${route.path}`));
        const h = readSeoHead(body);
        seoPages.push({ path: route.path, title: h.titles[0], description: h.descriptions[0] });
      }
      if (errors.length) failures.push(`${route.path}: ${errors.join("; ")}`);
      else console.log(`  ok   ${route.path}`);
    } catch (err) {
      failures.push(`${route.path}: request failed (${err.message})`);
    }
  }
  failures.push(...findDuplicateSeo(seoPages));
  failures.push(...(await checkSitemap(baseUrl, siteUrl, routes)));
  return { failures, count: routes.length };
}

/** /sitemap.xml lists exactly the prerendered public paths, absolute on the canonical host. */
async function checkSitemap(baseUrl, siteUrl, routes) {
  const res = await fetch(new URL("/sitemap.xml", baseUrl), { redirect: "manual" });
  if (res.status !== 200) return [`/sitemap.xml: expected HTTP 200, got ${res.status}`];
  const locs = sitemapLocs(await res.text());
  const expected = routes.filter((r) => r.expectH1 !== undefined && r.path !== "/404.html").map((r) => `${siteUrl}${r.path}`);
  const missing = expected.filter((u) => !locs.includes(u));
  const extra = locs.filter((u) => !expected.includes(u));
  const dup = locs.length !== new Set(locs).size;
  const errors = [];
  if (missing.length) errors.push(`/sitemap.xml is missing ${missing.join(", ")}`);
  if (extra.length) errors.push(`/sitemap.xml lists unexpected ${extra.join(", ")}`);
  if (dup) errors.push("/sitemap.xml has duplicate URLs");
  if (!errors.length) console.log(`  ok   /sitemap.xml (${locs.length} URLs)`);
  return errors;
}

function checkBuiltAssets(distDir) {
  const failures = [];
  const assetsDir = join(distDir, "assets");
  if (!existsSync(assetsDir)) return { failures: [`${assetsDir} does not exist (run the build first)`], count: 0 };
  const files = readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
  // A scan over nothing passes on nothing.
  if (files.length === 0) return { failures: [`no .js files in ${assetsDir}`], count: 0 };
  for (const file of files) {
    for (const leak of findSecretLeaks(readFileSync(join(assetsDir, file), "utf8"))) {
      failures.push(`dist/assets/${file}: contains ${leak}`);
    }
  }
  if (!failures.length) console.log(`  ok   ${files.length} JS asset(s) free of secret patterns`);
  return { failures, count: files.length };
}

/** Per-file budget for any raster image shipped in dist/ (STS-023). Largest today is ~175 kB. */
export const IMAGE_BUDGET_BYTES = 400 * 1024;
const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif)$/i;

/** Every raster image under `dir` (recursive) with its size in bytes. */
export function listImages(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listImages(full));
    else if (IMAGE_EXT.test(entry.name)) out.push({ file: full, bytes: statSync(full).size });
  }
  return out;
}

function checkImageBudget(distDir) {
  if (!existsSync(distDir)) return { failures: [`${distDir} does not exist (run the build first)`], count: 0 };
  const images = listImages(distDir);
  if (images.length === 0) return { failures: [`no images found in ${distDir}`], count: 0 };
  const failures = images
    .filter((i) => i.bytes > IMAGE_BUDGET_BYTES)
    .map((i) => `${i.file.slice(distDir.length + 1)}: ${(i.bytes / 1024).toFixed(0)} kB exceeds the ${IMAGE_BUDGET_BYTES / 1024} kB image budget`);
  const max = Math.max(...images.map((i) => i.bytes));
  if (!failures.length) console.log(`  ok   ${images.length} image(s) within budget (largest ${(max / 1024).toFixed(0)} kB)`);
  return { failures, count: images.length };
}

/** Third-party font hosts that must not appear in the shipped HTML/CSS (STS-048). */
export const GOOGLE_FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

/** One finding per built .html/.css file under `dir` (recursive) that references a Google font host. */
export function findGoogleFontRefs(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findGoogleFontRefs(full));
    else if (/\.(html|css)$/i.test(entry.name) && GOOGLE_FONT_HOSTS.test(readFileSync(full, "utf8"))) out.push(full);
  }
  return out;
}

function listWoff2(dir) {
  const assets = join(dir, "assets");
  return existsSync(assets) ? readdirSync(assets).filter((f) => f.endsWith(".woff2")) : [];
}

function checkFonts(distDir) {
  if (!existsSync(distDir)) return { failures: [`${distDir} does not exist (run the build first)`], count: 0 };
  const failures = findGoogleFontRefs(distDir).map((f) => `${f.slice(distDir.length + 1)}: references a Google font host (fonts must be self-hosted)`);
  const woff2 = listWoff2(distDir);
  if (woff2.length === 0) failures.push("no .woff2 emitted in dist/assets (self-hosted fonts missing)");
  if (!failures.length) console.log(`  ok   ${woff2.length} woff2 font(s) self-hosted, no Google font host in HTML/CSS`);
  return { failures, count: woff2.length };
}

async function main() {
  const baseUrl = process.argv[2];
  if (!baseUrl) {
    console.error("usage: node tests/smoke/smoke.mjs <baseUrl>");
    process.exit(2);
  }
  console.log(`smoke: ${baseUrl}`);
  const routes = await checkRoutes(baseUrl);
  const assets = checkBuiltAssets(join(ROOT, "dist"));
  const images = checkImageBudget(join(ROOT, "dist"));
  const fonts = checkFonts(join(ROOT, "dist"));
  const failures = [...routes.failures, ...assets.failures, ...images.failures, ...fonts.failures];
  if (failures.length) {
    console.error(`\nsmoke FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  FAIL ${f}`);
    process.exit(1);
  }
  console.log(`\nsmoke passed: ${routes.count} route(s), ${assets.count} asset(s) scanned, ${images.count} image(s) in budget, ${fonts.count} woff2 font(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`smoke crashed: ${err.stack || err}`);
    process.exit(1);
  });
}
