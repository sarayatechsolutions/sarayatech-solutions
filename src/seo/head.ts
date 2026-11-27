import { OWNED_KEYS, type HeadTag } from "./seo";
import { JSON_LD_ATTR, serializeJsonLd } from "./structuredData";

/**
 * Client side of STS-024: replaces the page's JSON-LD after a client-side navigation, so the
 * previous page's Organization or Service never lingers. Only the scripts this module owns
 * (marked with JSON_LD_ATTR) are touched, and the JSON goes in as text, never as markup.
 */
export function applyJsonLd(doc: Document, docs: unknown[]): void {
  doc.head.querySelectorAll(`script[type="application/ld+json"][${JSON_LD_ATTR}]`).forEach((el) => el.remove());
  for (const data of docs) {
    const el = doc.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute(JSON_LD_ATTR, "");
    el.textContent = serializeJsonLd(data);
    doc.head.appendChild(el);
  }
}

function selectorFor(key: string): string {
  if (key === "canonical") return 'link[rel="canonical"]';
  return key.startsWith("og:") ? `meta[property="${key}"]` : `meta[name="${key}"]`;
}

/**
 * Client side of STS-021. The prerendered HTML already carries the right tags; this keeps
 * them right after a client-side navigation, updating in place (never appending a duplicate).
 */
export function applyHeadTags(doc: Document, tags: HeadTag[]): void {
  const keep = new Set(tags.map((t) => t.key));
  // Drop tags the new page does not have (e.g. the canonical on the 404 page).
  for (const key of OWNED_KEYS) {
    if (!keep.has(key)) doc.head.querySelectorAll(selectorFor(key)).forEach((el) => el.remove());
  }
  for (const t of tags) {
    if (t.tag === "title") {
      doc.title = t.text ?? "";
      continue;
    }
    let el = doc.head.querySelector(selectorFor(t.key));
    if (!el) {
      el = doc.createElement(t.tag);
      doc.head.appendChild(el);
    }
    for (const [k, v] of Object.entries(t.attrs)) el.setAttribute(k, v);
  }
}
