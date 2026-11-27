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

/**
 * `fetchpriority="high"` for the one LCP image of a page (FF-12). React 18 does not know the
 * camel-case `fetchPriority` prop and warns, so the lowercase HTML attribute is spread as is.
 */
export const HIGH_FETCH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;
