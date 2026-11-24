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

/** Phrases the built home page must not contain (REQ-011, REQ-012, REQ-058), as written in the source. */
export const HOME_FORBIDDEN_PHRASES = [
  "Enterprise-grade",
  "Enterprise Technology Solutions",
  "Digital Transformation",
  "Transform your business",
  "pay for themselves",
];

/**
 * Service pages (STS-032): the home list plus the operational promises the owner has not
 * confirmed (I-12). Prices are guarded by the unit tests, which can match a pattern.
 */
export const SERVICE_FORBIDDEN_PHRASES = [...HOME_FORBIDDEN_PHRASES, "fixed price", "30-minute"];

/**
 * About page (STS-036): the home list, "Enterprise" in any form, the stock group photo that was
 * presented as the team (REQ-015), and the founding-year / founder placeholders (C7, REQ-062).
 * Years, counts and percentages are guarded by About.test.tsx, which can match a pattern.
 */
export const ABOUT_FORBIDDEN_PHRASES = [
  ...HOME_FORBIDDEN_PHRASES,
  "Enterprise",
  "team-photo",
  "founded in",
  "[year]",
  "[founder",
];

/**
 * REQ-011 (P0): no built page may contain these, whoever owns it. Matched case-insensitively.
 * STS-039 retired the last pages that carried them (the enterprise industry pages); the
 * prerender's own <head> replaces index.html's old title and description.
 */
export const SITEWIDE_FORBIDDEN_PHRASES = ["Enterprise-grade", "Enterprise Technology Solutions"];

/** The five service pages and their <h1> (src/content/services/services.ts). */
export const SERVICE_ROUTES = [
  { path: "/services/website-design", expectH1: "Websites that win customers" },
  { path: "/services/app-development", expectH1: "Apps and custom software that save you time" },
  { path: "/services/local-seo", expectH1: "Get found on Google" },
  { path: "/services/social-media-marketing", expectH1: "Social media done for you" },
  { path: "/services/paid-ads", expectH1: "Track every ad dollar" },
];

/**
 * Public routes: every path src/routes.tsx prerenders (STS-020), each with the page's
 * real <h1> text, so an empty client-rendered shell fails. A unit test keeps this list
 * in step with getPublicPaths().
 * @type {{ path: string, expectH1?: string, expectText?: string, forbidText?: string[], contentType?: string, shell?: boolean }[]}
 */
export function buildRoutes() {
  return [
    {
      path: "/",
      expectH1: "We build your website. Then we bring you customers.",
      // STS-031: the source's banned phrases (REQ-011, REQ-012) and the unbacked ads claim (REQ-058).
      forbidText: HOME_FORBIDDEN_PHRASES,
    },
    {
      path: "/about",
      expectH1: "Your neighbors in tech",
      // STS-036: banned phrases, the stock "team" photo, and claims C7 has not supplied.
      forbidText: ABOUT_FORBIDDEN_PHRASES,
    },
    {
      path: "/contact",
      expectH1: "Let's talk about your business",
      // STS-044: no response time is promised until the owner confirms one (C16, I-12).
      forbidText: ["24 hours", "24-48 hours"],
    },
    { path: "/realisation", expectH1: "Recent Realisations" },
    { path: "/insights", expectH1: "Insights & Resources" },
    { path: "/careers", expectH1: "Join Our Team" },
    // STS-039: the hub that replaced /solutions. The retired pages are checked by checkRedirectsBuild.
    { path: "/services", expectH1: "Our services", forbidText: SERVICE_FORBIDDEN_PHRASES },
    ...SERVICE_ROUTES.map((r) => ({ ...r, forbidText: SERVICE_FORBIDDEN_PHRASES })),
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

/**
 * Rules of a Cloudflare Pages `_redirects` file: `{ line, from, to, status }`, comments and blank
 * lines skipped. A line that is not exactly `<from> <to> [status]` throws: Cloudflare would ignore
 * it silently, and a redirect nobody can see failing is the bug this guards against.
 */
export function parseRedirects(text) {
  const rules = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) throw new Error(`_redirects line ${i + 1} is malformed: ${line}`);
    const [from, to, code = "302"] = parts;
    rules.push({ line: i + 1, from, to, status: Number(code) });
  });
  return rules;
}

/** True when the rule's source matches `path` (one trailing `*` splat, as Cloudflare allows). */
export function redirectMatches(from, path) {
  return from.endsWith("*") ? path.startsWith(from.slice(0, -1)) : path === from;
}

/** dist file a prerendered path is written to ("/" -> index.html, "/a/b" -> a/b/index.html). */
const distPageFile = (distDir, path) => join(distDir, ...path.split("/").filter(Boolean), "index.html");

/**
 * STS-039: dist/_redirects ships, every rule is a 301, no source is still a built page (Cloudflare
 * would redirect it anyway, hiding the page), and every target is a built page (no 301 to a 404).
 * `vite preview` does not apply _redirects, so this reads the build output instead of the server.
 */
export function checkRedirectsBuild(distDir) {
  const file = join(distDir, "_redirects");
  if (!existsSync(file)) return { failures: [`${file} does not exist (public/_redirects not copied?)`], count: 0 };
  let rules;
  try {
    rules = parseRedirects(readFileSync(file, "utf8"));
  } catch (err) {
    return { failures: [`dist/_redirects: ${err.message}`], count: 0 };
  }
  if (rules.length === 0) return { failures: ["dist/_redirects has no rule"], count: 0 };
  const failures = [];
  for (const r of rules) {
    if (r.status !== 301) failures.push(`dist/_redirects line ${r.line}: ${r.from} is a ${r.status}, not a 301`);
    if (!r.from.endsWith("*") && r.from !== "/" && existsSync(distPageFile(distDir, r.from))) {
      failures.push(`dist/_redirects line ${r.line}: ${r.from} is still a built page`);
    }
    if (!existsSync(distPageFile(distDir, r.to))) failures.push(`dist/_redirects line ${r.line}: target ${r.to} is not a built page`);
  }
  if (!failures.length) console.log(`  ok   dist/_redirects (${rules.length} rule(s), every target built, no source built)`);
  return { failures, count: rules.length };
}

/** Every .html file under `dir` (recursive). */
function listHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtml(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

/** One finding per (file, phrase) where a built HTML file contains a sitewide-forbidden phrase. */
export function findForbiddenInHtml(dir, phrases = SITEWIDE_FORBIDDEN_PHRASES) {
  const out = [];
  for (const file of listHtml(dir)) {
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const phrase of phrases) if (text.includes(phrase.toLowerCase())) out.push({ file, phrase });
  }
  return out;
}

function checkSitewidePhrases(distDir) {
  if (!existsSync(distDir)) return { failures: [`${distDir} does not exist (run the build first)`], count: 0 };
  const count = listHtml(distDir).length;
  if (count === 0) return { failures: [`no .html files in ${distDir}`], count: 0 };
  const failures = findForbiddenInHtml(distDir).map(
    ({ file, phrase }) => `${file.slice(distDir.length + 1)}: contains ${JSON.stringify(phrase)} (REQ-011)`,
  );
  if (!failures.length) console.log(`  ok   ${count} built HTML file(s) free of ${SITEWIDE_FORBIDDEN_PHRASES.join(" / ")}`);
  return { failures, count };
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
  for (const phrase of route.forbidText ?? []) {
    if (body.includes(phrase)) errors.push(`contains forbidden text ${JSON.stringify(phrase)}`);
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
  const redirects = checkRedirectsBuild(join(ROOT, "dist"));
  const phrases = checkSitewidePhrases(join(ROOT, "dist"));
  const failures = [
    ...routes.failures,
    ...assets.failures,
    ...images.failures,
    ...fonts.failures,
    ...redirects.failures,
    ...phrases.failures,
  ];
  if (failures.length) {
    console.error(`\nsmoke FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  FAIL ${f}`);
    process.exit(1);
  }
  console.log(
    `\nsmoke passed: ${routes.count} route(s), ${assets.count} asset(s) scanned, ${images.count} image(s) in budget, ${fonts.count} woff2 font(s), ${redirects.count} redirect(s), ${phrases.count} HTML file(s) phrase-checked`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`smoke crashed: ${err.stack || err}`);
    process.exit(1);
  });
}
