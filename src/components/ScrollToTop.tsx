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

/**
 * A stored key is `<history key>|<pathname>`: never the query string or the hash, which can carry
 * personal data from an inbound link (`/contact?email=...`) and are not needed to tell entries
 * apart. Older builds stored the full URL; such entries fail this check and are dropped.
 */
const STORED_KEY = /^[^|?#]*\|\/[^?#]*$/;

/** The stored positions, current format only. `stale` is true when anything was dropped. */
function load(): { positions: Positions; stale: boolean } {
  try {
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return { positions: new Map(), stale: true };
    const valid = raw.filter(
      (e): e is [string, number] =>
        Array.isArray(e) && typeof e[0] === "string" && STORED_KEY.test(e[0]) && Number.isFinite(e[1]),
    );
    return { positions: new Map(valid), stale: valid.length !== raw.length };
  } catch {
    return { positions: new Map(), stale: true };
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

/** Loads the positions; rewrites storage at once if older-format or corrupt data was dropped, so it
 * does not linger in the tab until the next pagehide. */
function loadAndClean(): Positions {
  const { positions, stale } = load();
  if (stale) save(positions);
  return positions;
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

/**
 * One key per history entry: `location.key` is unique per entry the router created. Entries without
 * router state (the first page load, a plain `#anchor` link) all have the key "default", so the
 * pathname is added; the query and hash are deliberately left out (see STORED_KEY).
 */
const entryKey = (l: Location) => `${l.key}|${l.pathname}`;

const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Positions | null>(null);
  const current = useRef<string>(entryKey(location));
  const previous = useRef<{ pathname: string; hash: string } | null>(null);

  // Take scrolling over from the browser, and record the position of the entry being viewed.
  useEffect(() => {
    positions.current ??= loadAndClean();
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
    const samePage = previous.current?.pathname === location.pathname;
    const hashChanged = previous.current !== null && previous.current.hash !== location.hash;
    previous.current = { pathname: location.pathname, hash: location.hash };
    current.current = key;

    positions.current ??= loadAndClean();
    const saved = positions.current.get(key);
    const target = hashTarget(location.hash);

    if (navigationType === "POP") {
      // A plain `#anchor` link (the skip link) is a POP with no router state on the same page. It
      // shares its key with the page, so its saved position is the page's: never restore that over
      // the jump the visitor asked for.
      const anchorJump = location.key === "default" && samePage && hashChanged;
      // Back/Forward, or a reload of this entry: where the visitor was. A first visit to a URL with
      // a hash, or an in-page anchor, goes to its target; otherwise leave it be.
      if (saved !== undefined && !anchorJump) window.scrollTo(0, saved);
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
