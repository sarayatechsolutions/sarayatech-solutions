#!/usr/bin/env node
// Smoke test for the BUILT site, served by `vite preview` (see vantry.yml run.smoke).
//
//   node tests/smoke/smoke.mjs http://localhost:4173
//
// No browser: Node's fetch requests every public route and asserts the response is
// the app shell, then the build output in dist/assets is scanned for leaked secrets.
//
// The route table is the extension point. Sprint 2 (prerender) adds an `expectText`
// per route, for example the route's H1; when it is set the HTML must contain it.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");

/** First id of a JSON array file under data/, so the route follows the content. */
function firstJsonId(relPath) {
  const items = JSON.parse(readFileSync(join(ROOT, relPath), "utf8"));
  const id = Array.isArray(items) ? items.find((x) => x && x.id)?.id : undefined;
  if (!id) throw new Error(`no item with an id in ${relPath}`);
  return id;
}

/** First `id: "..."` in a TS constants file (it is not importable from plain Node). */
function firstTsId(relPath) {
  const m = /\bid:\s*["']([^"']+)["']/.exec(readFileSync(join(ROOT, relPath), "utf8"));
  if (!m) throw new Error(`no id found in ${relPath}`);
  return m[1];
}

/**
 * Public routes from src/App.tsx.
 * @type {{ path: string, expectText?: string, contentType?: string, shell?: boolean }[]}
 */
export function buildRoutes() {
  return [
    { path: "/" },
    { path: "/about" },
    { path: "/contact" },
    { path: "/solutions" },
    { path: `/solutions/${firstJsonId("data/solutions.json")}` },
    { path: "/industries" },
    { path: `/industry/${firstTsId("src/constants/industries.ts")}` },
    { path: "/realisation" },
    { path: "/insights" },
    { path: "/careers" },
    { path: "/robots.txt", shell: false, expectText: "User-agent", contentType: "text/plain" },
  ];
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
  if (route.expectText && !body.includes(route.expectText)) {
    errors.push(`missing expected text ${JSON.stringify(route.expectText)}`);
  }
  return errors;
}

async function checkRoutes(baseUrl) {
  const failures = [];
  const routes = buildRoutes();
  for (const route of routes) {
    const url = new URL(route.path, baseUrl).toString();
    try {
      const res = await fetch(url, { redirect: "manual" });
      const body = await res.text();
      const errors = checkRouteBody(route, res.status, res.headers.get("content-type"), body);
      if (errors.length) failures.push(`${route.path}: ${errors.join("; ")}`);
      else console.log(`  ok   ${route.path}`);
    } catch (err) {
      failures.push(`${route.path}: request failed (${err.message})`);
    }
  }
  return { failures, count: routes.length };
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
  const failures = [...routes.failures, ...assets.failures, ...images.failures];
  if (failures.length) {
    console.error(`\nsmoke FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  FAIL ${f}`);
    process.exit(1);
  }
  console.log(`\nsmoke passed: ${routes.count} route(s), ${assets.count} asset(s) scanned, ${images.count} image(s) in budget`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`smoke crashed: ${err.stack || err}`);
    process.exit(1);
  });
}
