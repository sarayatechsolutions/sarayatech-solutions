/**
 * Shared link policy (STS-058 / REQ-154 / SEC-16; blog posts: security addendum 7, A7-2).
 *
 * Moved here from src/components/chatbot/links.ts so the chatbot and the blog body share ONE
 * classifier. The old path re-exports it, so the chatbot's behaviour is unchanged. This module
 * imports nothing, so any layer (content, SEO, components) may use it without a cycle.
 *
 * Bot replies are untrusted: they can come from the LLM, which a visitor can steer. So every
 * href in a reply is classified here, once, and the renderer only ever uses the result:
 *
 *  - internal : a single-slash, root-relative path that stays on this origin ("/contact"), and
 *               whose NORMALISED path is still single-slash (so "/.//evil.tld" is not one).
 *               Routed with react-router, using the normalised path, never the raw href.
 *  - external : an absolute http(s) URL, or a protocol-relative "//host" (which browsers
 *               resolve to another host). Rendered as a plain new-tab link with
 *               rel="noopener noreferrer", never routed.
 *  - text     : everything else (javascript:, data:, vbscript:, mailto:, tel:, relative
 *               paths, "#", empty, unparseable). Rendered as plain text, not a link.
 */
export type LinkTarget =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | { kind: "text" };

// A sentinel origin used only to resolve a path and see whether it leaves the origin.
const SENTINEL = "https://same-origin.invalid";

// Browsers drop ASCII tab/newline inside URLs and trim leading/trailing C0 controls and
// spaces, so "/\t/evil.tld" is really "//evil.tld". Refuse any such character outright.
// eslint-disable-next-line no-control-regex
const CONTROL_OR_SPACE = /[\u0000- \u007f]/;

export function classifyHref(href: string | undefined | null): LinkTarget {
  if (typeof href !== "string" || href.length === 0 || CONTROL_OR_SPACE.test(href)) {
    return { kind: "text" };
  }

  // Protocol-relative ("//host") and the backslash variant ("/\host", "\\host") name another
  // host. They are external, never internal, and are given an explicit https: scheme.
  if (/^[/\\]{2}/.test(href)) {
    return externalOrText(`https:${href.replace(/\\/g, "/")}`);
  }

  if (/^\/(?![/\\])/.test(href)) {
    let url: URL;
    try {
      url = new URL(href, SENTINEL);
    } catch {
      return { kind: "text" };
    }
    if (url.origin !== SENTINEL) return { kind: "text" };

    // Dot segments ("/.//x", "/a/..//x", "/%2e//x", "/./\x") pass the single-slash test above
    // but NORMALISE to "//x", which a browser reads as another host. The href we emit is the
    // normalised path, so it is the normalised path that must stay single-slash. Such a link
    // is never legitimate: plain text, not internal and not external.
    const path = url.pathname;
    if (/^[/\\]{2}/.test(path)) return { kind: "text" };

    // Belt and braces: the exact string written into <a href> must itself resolve back to this
    // origin and to the same path, or it is not internal.
    const emitted = `${path}${url.search}${url.hash}`;
    let check: URL;
    try {
      check = new URL(emitted, SENTINEL);
    } catch {
      return { kind: "text" };
    }
    if (check.origin !== SENTINEL || check.pathname !== path) return { kind: "text" };

    return { kind: "internal", href: emitted };
  }

  return externalOrText(href);
}

function externalOrText(candidate: string): LinkTarget {
  // Must name its scheme explicitly; a bare word or relative path is not a link.
  if (!/^https?:\/\//i.test(candidate)) return { kind: "text" };
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { kind: "text" };
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return { kind: "text" };
  return { kind: "external", href: url.href };
}

/**
 * True only for same-origin, root-relative app paths such as "/solutions".
 * Protocol-relative ("//evil.example") and backslash ("/\evil.example") forms are
 * treated by browsers as another host, so they are external.
 */
export function isInternalHref(href: string | undefined | null): href is string {
  return classifyHref(href).kind === "internal";
}
