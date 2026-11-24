import { OWNED_KEYS, type HeadTag } from "./seo";

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
