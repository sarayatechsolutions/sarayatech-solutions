/**
 * Consent-aware analytics (STS-050, REQ-043). Runbook: docs/ops/analytics.md.
 *
 * Three states, and nothing loads in the first two:
 *  1. No GA4 id configured (today): every export is a no-op. No script, no cookie, no network,
 *     no storage write, no banner.
 *  2. Id configured, visitor has not accepted: no Google script. The banner asks; Decline is
 *     stored and respected on every later visit.
 *  3. Id configured and the visitor accepted: the gtag script for that id is injected once, with
 *     Consent Mode v2 defaults of denied, then analytics_storage (only) updated to granted. The ad
 *     signals stay denied and Google signals / ad personalization are switched off in config.
 *
 * NO PII, EVER. Every event goes through an allow-list: each parameter must be one of a fixed set
 * of values (enums, never free text), so a name, email, phone number or message cannot be sent,
 * not even by mistake. Unknown events and unknown or out-of-enum parameters are dropped.
 *
 * SSR / prerender safe: nothing here touches `window`, `document` or `localStorage` at import
 * time, and every function returns early outside a browser.
 */
import { GA4_ID } from "@/config/analytics";
import { LEAD_SOURCES } from "@/content/forms/lead-source";

/** The single localStorage key holding the visitor's choice. */
export const CONSENT_STORAGE_KEY = "sts_analytics_consent";

export type ConsentChoice = "granted" | "denied";

/** Marker on the injected script tag, so it can be found (and is only ever added once). */
export const GTAG_SCRIPT_ATTR = "data-sts-analytics";

export const gtagScriptSrc = (id: string) => `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;

/** Primary booking / consultation CTAs. Fixed ids, set as `data-track-cta` on the link. */
export const CTA_IDS = ["header_cta", "hero_consultation", "final_consultation", "final_audit"] as const;
export type CtaId = (typeof CTA_IDS)[number];

export const LEAD_FORMS = ["contact", "audit"] as const;
export type LeadForm = (typeof LEAD_FORMS)[number];

export const CONTACT_METHODS = ["email", "phone", "sms"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

/** Where a contact link sits; read from the link's existing `data-cta-location`. */
export const CONTACT_LOCATIONS = ["header", "menu", "footer", "contact"] as const;

/**
 * The allow-list. Event name -> parameter name -> the only values that parameter may carry.
 * Anything not listed here never reaches Google.
 */
export const EVENT_SCHEMA = {
  generate_lead: { form: LEAD_FORMS, lead_source: LEAD_SOURCES },
  cta_click: { cta: CTA_IDS },
  contact_click: { method: CONTACT_METHODS, location: CONTACT_LOCATIONS },
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type AnalyticsEvent = keyof typeof EVENT_SCHEMA;

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const inBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

/**
 * STS-076 (security addendum 6, A6-1): Google's documented per-property opt-out. While
 * `window["ga-disable-<id>"]` is true, gtag.js sends nothing for that id, including the events it
 * creates by itself (Enhanced measurement scrolls, outbound clicks, engagement pings), which our
 * own consentGranted check cannot reach. Set on Decline, cleared on Accept.
 */
export const gaDisableKey = (id: string) => `ga-disable-${id}`;
function setGaDisabled(id: string, disabled: boolean): void {
  (window as unknown as Record<string, unknown>)[gaDisableKey(id)] = disabled;
}

/** The id the gtag script was loaded for, once loaded. Module state, browser only. */
let loadedId: string | null = null;

/**
 * Whether the visitor's current choice is "granted" (security addendum 5, A5-1). gtag.js stays on the
 * page after a Decline until the next load, so every send checks this, not just whether it was loaded.
 */
let consentGranted = false;

/** Keeps only allow-listed parameters whose value is in that parameter's enum. */
export function sanitizeParams(event: string, params: Record<string, unknown> = {}): Record<string, string> | null {
  if (!Object.prototype.hasOwnProperty.call(EVENT_SCHEMA, event)) return null;
  const allowed = EVENT_SCHEMA[event as AnalyticsEvent] as Record<string, readonly string[]>;
  const out: Record<string, string> = {};
  for (const key of Object.keys(allowed)) {
    const value = params[key];
    if (typeof value === "string" && allowed[key].includes(value)) out[key] = value;
  }
  return out;
}

/** The stored choice, or null when none (or an unreadable / unknown value) is stored. */
export function getStoredConsent(): ConsentChoice | null {
  if (!inBrowser()) return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null; // storage blocked: treat as "not chosen", which loads nothing
  }
}

/** True when the banner should be shown: an id is configured and no choice is stored. */
export function needsConsentPrompt(id: string | null = GA4_ID): boolean {
  return id !== null && inBrowser() && getStoredConsent() === null;
}

export const isAnalyticsLoaded = () => loadedId !== null;

/**
 * STS-070 (addendum 4 LOW): gtag.js fills page_location from the full URL, query string and fragment
 * included, on every event unless told otherwise. A link like /contact?email=... would then reach Google.
 * Every location and referrer we hand to gtag goes through this: origin + path, nothing after ? or #.
 */
/** A5-3: only the referring site's origin; its path could carry anything about the visitor. */
export function referrerOrigin(href: string): string {
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : "";
  } catch {
    return "";
  }
}

export function cleanLocation(href: string): string {
  try {
    const u = new URL(href, window.location.origin);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "";
  }
}

/** Injects gtag for `id`, once. Only ever called after an explicit "granted". */
function loadGtag(id: string): void {
  if (!inBrowser() || loadedId !== null) return;
  loadedId = id;
  window.dataLayer = window.dataLayer ?? [];
  // gtag must push the `arguments` object itself, not an array copy.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  const gtag = window.gtag;
  // Consent Mode v2: everything denied by default...
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  // ...then only analytics storage granted, because the visitor said yes. Ads stay denied.
  gtag("consent", "update", { analytics_storage: "granted" });
  gtag("js", new Date());
  gtag("config", id, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    // Page views are sent by trackPageView (path only, no query string), not automatically.
    send_page_view: false,
    page_location: cleanLocation(window.location.href),
    page_referrer: document.referrer ? referrerOrigin(document.referrer) : "",
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = gtagScriptSrc(id);
  script.setAttribute(GTAG_SCRIPT_ATTR, "");
  document.head.appendChild(script);
}

/** Called once on the client: loads gtag only if consent was granted on an earlier visit. */
export function initAnalytics(id: string | null = GA4_ID): void {
  if (id === null || !inBrowser()) return;
  if (getStoredConsent() === "granted") {
    consentGranted = true;
    loadGtag(id);
  }
}

/** Records the visitor's choice. With no id configured it does nothing at all (not even storage). */
export function setConsent(choice: ConsentChoice, id: string | null = GA4_ID): void {
  if (id === null || !inBrowser()) return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage blocked: the choice applies to this page view only.
  }
  if (choice === "granted") {
    consentGranted = true;
    // Accepting again on the same page after a Decline: gtag is already there, so just re-grant storage.
    if (loadedId !== null) {
      setGaDisabled(loadedId, false);
      window.gtag?.("consent", "update", { analytics_storage: "granted" });
    } else loadGtag(id);
  } else {
    // From here on nothing is sent (track and trackPageView check this), even before a reload.
    consentGranted = false;
    if (loadedId !== null) {
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
      setGaDisabled(loadedId, true);
    }
    deleteGaCookies();
  }
}

/**
 * STS-071: the window event the footer's "Cookie settings" button fires and <Analytics> listens
 * for, to show the banner again. Decline from there withdraws an earlier Accept.
 */
export const CONSENT_SETTINGS_EVENT = "sts:consent-settings";

/** Re-opens the consent banner. A no-op with no id configured, or outside a browser. */
export function openConsentSettings(id: string | null = GA4_ID): void {
  if (id === null || !inBrowser()) return;
  window.dispatchEvent(new Event(CONSENT_SETTINGS_EVENT));
}

/**
 * STS-071: expires Google Analytics' first-party cookies (`_ga` and `_ga_<stream>`), on every
 * domain gtag may have set them on: none (host-only), the host, and each parent domain
 * (gtag's `cookie_domain: "auto"` picks the highest one it can write).
 */
export function deleteGaCookies(): void {
  if (!inBrowser()) return;
  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((n) => n === "_ga" || n.startsWith("_ga_"));
  if (names.length === 0) return;
  const parts = window.location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join(".")}`);
  const expired = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  for (const n of names) for (const d of domains) document.cookie = `${n}${expired}${d}`;
}

/** Sends one allow-listed event. A no-op unless consent is granted now and gtag was loaded. */
export function track(event: AnalyticsEvent, params: Record<string, unknown> = {}): void {
  if (!consentGranted || loadedId === null || !inBrowser() || typeof window.gtag !== "function") return;
  const clean = sanitizeParams(event, params);
  if (clean === null) return;
  window.gtag("event", event, clean);
}

/** generate_lead on a successful form submit. `leadSource` is dropped unless it is one of the five values. */
export function trackLead(form: LeadForm, leadSource?: unknown): void {
  track("generate_lead", { form, lead_source: leadSource });
}

/** page_view with the path only: a query string or hash could carry anything, so neither is sent. */
export function trackPageView(pathname: string): void {
  if (!consentGranted || loadedId === null || !inBrowser() || typeof window.gtag !== "function") return;
  const path = pathname.split(/[?#]/)[0] || "/";
  // Keep gtag's own page_location (used by every later event) query-free for this route too.
  window.gtag("set", { page_location: cleanLocation(path), page_referrer: "" });
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: cleanLocation(path),
    page_title: document.title,
  });
}

/**
 * Maps a click to an event: a link with `data-track-cta` -> cta_click; a mailto:/tel:/sms: link
 * -> contact_click with the method (never the address or number). Returns the event the click
 * maps to (sent only if consent was given), or null.
 */
export function trackClick(target: EventTarget | null): AnalyticsEvent | null {
  if (!inBrowser() || !(target instanceof Element)) return null;
  const cta = target.closest("[data-track-cta]");
  if (cta) {
    track("cta_click", { cta: cta.getAttribute("data-track-cta") });
    return "cta_click";
  }
  const link = target.closest("a[href]");
  const href = link?.getAttribute("href")?.trim().toLowerCase() ?? "";
  const method: ContactMethod | null = href.startsWith("mailto:")
    ? "email"
    : href.startsWith("tel:")
      ? "phone"
      : href.startsWith("sms:")
        ? "sms"
        : null;
  if (!link || method === null) return null;
  track("contact_click", { method, location: link.getAttribute("data-cta-location") });
  return "contact_click";
}

/** Test helper: forget the loaded state and remove everything gtag added. */
export function resetAnalyticsForTests(): void {
  const wasLoaded = loadedId;
  loadedId = null;
  consentGranted = false;
  if (!inBrowser()) return;
  if (wasLoaded !== null) delete (window as unknown as Record<string, unknown>)[gaDisableKey(wasLoaded)];
  document.querySelectorAll(`script[${GTAG_SCRIPT_ATTR}]`).forEach((s) => s.remove());
  delete window.gtag;
  delete window.dataLayer;
}
