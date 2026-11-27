import manifest from "@/generated/image-manifest.json";

type Entry = { width: number; height: number; variants: { w: number; src: string }[] };
const entries = manifest as Record<string, Entry>;

/**
 * Attributes for an <img> whose `path` comes from data/*.json (e.g. "/images/cloud.webp").
 * Adds srcSet and the intrinsic width/height of the largest variant (the browser uses them
 * for aspect-ratio, so there is no layout shift). Unknown paths (the SVG placeholder)
 * return just `src`. `sizes` must describe the rendered width.
 */
export function responsiveImage(path: string, sizes: string) {
  const e = entries[path];
  if (!e) return { src: path };
  const srcSet = e.variants.length > 1 ? e.variants.map((v) => `${v.src} ${v.w}w`).join(", ") : undefined;
  return { src: path, srcSet, sizes: srcSet ? sizes : undefined, width: e.width, height: e.height };
}
