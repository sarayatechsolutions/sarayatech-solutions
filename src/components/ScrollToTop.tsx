import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType, type Location } from "react-router-dom";

/**
 * Scroll restoration for the client-side router (design audit FF-8). Renders nothing.
 *
 * `BrowserRouter` is not a data router, so React Router's <ScrollRestoration> is not available;
 * this does the same three jobs:
 *  - a new route (link click, PUSH) starts at the top;
 *  - Back and Forward (POP) return to where the visitor was on that history entry, also after a
 *    reload (positions are kept per history entry in sessionStorage);
 *  - a link with a hash scrolls its target into view. The offset for the fixed header is CSS:
 *    `html { scroll-padding-top: calc(var(--header-h) + 1rem) }` (src/index.css), which
 *    scrollIntoView honours, so no pixel value is repeated here.
 *
 * Every scroll is instant (never smooth): a jump is what the visitor asked for, and it is the only
 * behaviour that is right under prefers-reduced-motion too.
 *
 * The name and default export are kept from the old component (it scrolled to the top, smoothly,
 * on every pathname change, including Back).
 */

export const SCROLL_STORAGE_KEY = "sarayatech:scroll-positions";
/** Cap so a long session cannot grow sessionStorage without bound. */
const MAX_ENTRIES = 50;

// useLayoutEffect warns during the prerender; the effect never runs there anyway.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Positions = Map<string, number>;

function load(): Positions {
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return new Map();
    return new Map(raw.filter((e): e is [string, number] => Array.isArray(e) && typeof e[0] === "string" && Number.isFinite(e[1])));
  } catch {
    return new Map();
  }
}

function save(positions: Positions) {
  try {
    const entries = [...positions].slice(-MAX_ENTRIES);
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or blocked (private mode): restoration then works for this page view only.
  }
}

/** The element a hash points at, or null. `#top` and an empty hash mean the top of the page. */
export function hashTarget(hash: string): HTMLElement | null {
  if (!hash || hash === "#") return null;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    id = hash.slice(1);
  }
  return document.getElementById(id);
}

/** One key per history entry. Entries without router state share "default", so the URL is added. */
const entryKey = (l: Location) => `${l.key}|${l.pathname}${l.search}${l.hash}`;

const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Positions | null>(null);
  const current = useRef<string>(entryKey(location));
  const previousPath = useRef<string | null>(null);

  // Take scrolling over from the browser, and record the position of the entry being viewed.
  useEffect(() => {
    positions.current = load();
    const { history } = window;
    const before = history.scrollRestoration;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    let frame = 0;
    const record = () => {
      frame = 0;
      positions.current?.set(current.current, window.scrollY);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(record);
    };
    const persist = () => {
      record();
      if (positions.current) save(positions.current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", persist);
      if (frame) window.cancelAnimationFrame(frame);
      if ("scrollRestoration" in history) history.scrollRestoration = before;
    };
  }, []);

  // Before paint, so the new page never flashes at the old page's scroll position.
  useIsomorphicLayoutEffect(() => {
    const key = entryKey(location);
    const samePage = previousPath.current === location.pathname;
    previousPath.current = location.pathname;
    current.current = key;

    if (!positions.current) positions.current = load();
    const saved = positions.current.get(key);
    const target = hashTarget(location.hash);

    if (navigationType === "POP") {
      // Back/Forward, or a reload of this entry: where the visitor was. A first visit to a URL with
      // a hash, or an in-page anchor (the skip link), goes to its target; otherwise leave it be.
      if (saved !== undefined) window.scrollTo(0, saved);
      else if (target) target.scrollIntoView({ block: "start" });
      return;
    }
    if (target) {
      target.scrollIntoView({ block: "start" });
      return;
    }
    // REPLACE on the same page (a filter or query update) keeps the visitor where they are.
    if (navigationType === "REPLACE" && samePage) return;
    window.scrollTo(0, 0);
  }, [location.key, location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTop;
