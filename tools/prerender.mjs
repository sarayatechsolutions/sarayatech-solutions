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

/** Inserts rendered markup into the shell's empty root. Throws if the shell has no empty root. */
export function inject(template, appHtml) {
  if (!template.includes(ROOT_MARKER)) {
    throw new Error(`index.html has no ${ROOT_MARKER}; cannot inject prerendered markup`);
  }
  return template.replace(ROOT_MARKER, () => `<div id="root">${appHtml}</div>`);
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
  const { render, paths, NOT_FOUND_PATH } = entry;
  if (!paths?.length) throw new Error("the SSR entry exported no paths; refusing to prerender nothing");

  const written = [];
  const write = (rel, html) => {
    const file = join(distDir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
    written.push(rel);
  };

  for (const urlPath of paths) {
    write(outputFile(urlPath), inject(template, render(urlPath)));
  }
  write("404.html", inject(template, render(NOT_FOUND_PATH)));
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
