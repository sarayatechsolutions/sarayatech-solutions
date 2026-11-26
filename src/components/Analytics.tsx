import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ConsentBanner from "@/components/ConsentBanner";
import { MAIN_CONTENT_ID } from "@/components/Header";
import { GA4_ID } from "@/config/analytics";
import {
  CONSENT_SETTINGS_EVENT,
  initAnalytics,
  needsConsentPrompt,
  setConsent,
  trackClick,
  trackPageView,
  type ConsentChoice,
} from "@/lib/analytics";

interface AnalyticsProps {
  /** Override for tests; defaults to the configured GA4 id (null = analytics off). */
  id?: string | null;
}

/**
 * Browser-only analytics wiring (STS-050). Mounted by <App> inside the router; the prerender
 * entry never renders it, and its first render is null, so hydration sees no difference.
 *
 * With no id: renders nothing and adds no listener. With an id: loads gtag if consent was granted
 * earlier, otherwise shows the banner until the visitor chooses; sends a page_view per route
 * (no-op without consent) and maps clicks on tracked CTAs and contact links to events.
 */
const Analytics = ({ id = GA4_ID }: AnalyticsProps) => {
  const { pathname } = useLocation();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (id === null) return;
    initAnalytics(id);
    setShowBanner(needsConsentPrompt(id));
  }, [id]);

  // STS-071: the footer's "Cookie settings" button shows the banner again.
  useEffect(() => {
    if (id === null) return;
    const reopen = () => {
      setShowBanner(true);
      // A keyboard user pressed a button at the bottom of the page: take them to the banner.
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-consent-banner]")?.focus());
    };
    window.addEventListener(CONSENT_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_SETTINGS_EVENT, reopen);
  }, [id]);

  useEffect(() => {
    if (id !== null) trackPageView(pathname);
  }, [id, pathname]);

  useEffect(() => {
    if (id === null) return;
    const onClick = (e: MouseEvent) => {
      trackClick(e.target);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [id]);

  if (id === null || !showBanner) return null;

  const choose = (choice: ConsentChoice) => {
    // The focused button is about to disappear: hand focus to the main content, not to <body>.
    const hadFocus = document.activeElement?.closest("[data-consent-banner]") != null;
    setConsent(choice, id);
    if (choice === "granted") trackPageView(pathname);
    setShowBanner(false);
    if (hadFocus) document.getElementById(MAIN_CONTENT_ID)?.focus();
  };

  return <ConsentBanner onChoice={choose} />;
};

export default Analytics;
