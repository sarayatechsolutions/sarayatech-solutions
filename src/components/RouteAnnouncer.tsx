import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { getSeo } from "@/seo/seo";
import { MAIN_CONTENT_ID } from "@/components/Header";

/**
 * Route change announcements and focus (design audit FF-9).
 *
 * A client-side route change does not reload the page, so a screen reader hears nothing and focus
 * stays on the link that was clicked, now in a page that is gone. After each route change:
 *  - the new page's title (the same string as <title>, from getSeo) is announced in a polite live
 *    region;
 *  - on a forward navigation (a link, PUSH or REPLACE), focus moves to the page's <h1>, or to
 *    <main> when the page has none, without scrolling (ScrollToTop owns the scroll position).
 *
 * Nothing happens on the first render (the browser announces a real page load itself), on Back and
 * Forward (POP: focus is left to the browser, like a normal history traversal), or when only the
 * hash or the query changes (the same page; a hash link's target is ScrollToTop's job).
 *
 * The h1 gets tabIndex=-1 so it can take focus by script without entering the tab order; the base
 * focus style (`:focus-visible:not([tabindex="-1"])`, src/index.css) draws no ring on it.
 *
 * No role="status": the live region is aria-live only, so a page's own status region (the form
 * success panels) stays the only `status` on the page.
 */
export const ROUTE_ANNOUNCER_ATTR = "data-route-announcer";

export function focusMainHeading(): HTMLElement | null {
  const main = document.getElementById(MAIN_CONTENT_ID);
  const target = (main?.querySelector<HTMLElement>("h1") ?? main) as HTMLElement | null;
  if (!target) return null;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  return target;
}

const RouteAnnouncer = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const [message, setMessage] = useState("");
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = pathname;
    if (before === null || before === pathname) return;

    if (navigationType !== "POP") focusMainHeading();
    // Clear, then set on the next frame: a region whose text is replaced by the same string (two
    // routes sharing a title) would otherwise stay silent.
    setMessage("");
    const frame = window.requestAnimationFrame(() => setMessage(getSeo(pathname).title));
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run per page
  }, [pathname]);

  return (
    <div {...{ [ROUTE_ANNOUNCER_ATTR]: "" }} aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
};

export default RouteAnnouncer;
