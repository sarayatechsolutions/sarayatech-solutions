#!/usr/bin/env node
// Re-runnable image pipeline (STS-023).  node tools/optimize-images.mjs   (or: npm run images)
//
// Originals live in assets-src/ (NOT published). This writes web-sized WebP into
// public/images/ (served as-is) and src/assets/ (hashed by Vite), plus a manifest
// src/generated/image-manifest.json that src/lib/responsiveImage.ts turns into srcset.
// Never upscales. The largest variant keeps the plain name (name.webp); smaller ones
// are name-<w>.webp.
import sharp from "sharp";
import { mkdirSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets-src", "images");
const OUT = join(ROOT, "public", "images");

// maxWidth = largest variant (2x of the biggest display size); smallWidth = the 1x variant, if any.
const PROFILES = {
  solution: { maxWidth: 1600, smallWidth: 800, quality: 72 }, // hero/cover + cards
  screenshot: { maxWidth: 1600, smallWidth: 800, quality: 80 }, // text-heavy UI screenshots
  avatar: { maxWidth: 480, smallWidth: 240, quality: 78 }, // displayed at 160px
};
const PROFILE_OF = {
  "ai.jpg": "solution", "cloud.jpg": "solution", "custom-software.jpg": "solution",
  "data.jpg": "solution", "digital.jpg": "solution", "security.jpg": "solution", "web-dev.jpg": "solution",
  "ASTA.png": "screenshot", "bmv.png": "screenshot", "isaraya.png": "screenshot",
  "mimap.jpeg": "screenshot", "SarayaTechSenegal.png": "screenshot",
  "Issa.jpeg": "avatar", "Sanokho.jpeg": "avatar", "Tidiani.jpeg": "avatar",
};

const manifest = {};
const kb = (p) => (statSync(p).size / 1024).toFixed(0);

async function emit(input, outDir, urlDir, name, p) {
  const meta = await sharp(input).metadata();
  const max = Math.min(p.maxWidth, meta.width);
  const widths = p.smallWidth && meta.width > p.smallWidth ? [p.smallWidth, max] : [max];
  const variants = [];
  for (const w of [...new Set(widths)]) {
    const file = w === max ? `${name}.webp` : `${name}-${w}.webp`;
    const info = await sharp(input).rotate().resize({ width: w, withoutEnlargement: true })
      .webp({ quality: p.quality, effort: 6 }).toFile(join(outDir, file));
    variants.push({ w: info.width, h: info.height, src: `${urlDir}/${file}`, kB: kb(join(outDir, file)) });
    console.log(`  ${file}  ${info.width}x${info.height}  ${kb(join(outDir, file))} kB`);
  }
  const top = variants[variants.length - 1];
  manifest[top.src] = { width: top.w, height: top.h, variants: variants.map(({ w, src }) => ({ w, src })) };
}

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(SRC)) {
  const profile = PROFILE_OF[f];
  if (!profile) { console.warn(`skip ${f}: no profile`); continue; }
  console.log(`${f} (${kb(join(SRC, f))} kB)`);
  await emit(join(SRC, f), OUT, "/images", parse(f).name, PROFILES[profile]);
}

// Logo: displayed ~100px tall (footer, 1.25x scale) -> 300x200 covers 2x.
console.log("logo-white.png");
const logo = await sharp(join(ROOT, "assets-src", "logo-white.png")).resize({ width: 300 })
  .webp({ quality: 90, alpha: 90, effort: 6 }).toFile(join(ROOT, "public", "logo-white.webp"));
console.log(`  logo-white.webp ${logo.width}x${logo.height} ${kb(join(ROOT, "public", "logo-white.webp"))} kB`);

// About-page team photo goes through Vite's asset pipeline (imported), full-width banner.
console.log("team-photo.jpg");
const tp = await sharp(join(ROOT, "assets-src", "team-photo.jpg")).resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 72, effort: 6 }).toFile(join(ROOT, "src", "assets", "team-photo.webp"));
console.log(`  team-photo.webp ${tp.width}x${tp.height} ${kb(join(ROOT, "src", "assets", "team-photo.webp"))} kB`);

mkdirSync(join(ROOT, "src", "generated"), { recursive: true });
writeFileSync(join(ROOT, "src", "generated", "image-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`manifest: ${Object.keys(manifest).length} images`);
