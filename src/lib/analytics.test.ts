import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  CTA_IDS,
  GTAG_SCRIPT_ATTR,
  cleanLocation,
  gaDisableKey,
  referrerOrigin,
  getStoredConsent,
  initAnalytics,
  isAnalyticsLoaded,
  needsConsentPrompt,
  resetAnalyticsForTests,
  sanitizeParams,
  setConsent,
  track,
  trackClick,
  trackLead,
  trackPageView,
} from "./analytics";
import { GA4_ID } from "@/config/analytics";
import { LEAD_SOURCES } from "@/content/forms/lead-source";

// STS-050 (REQ-043). The library is driven with an explicit id, so these hold whatever the build
// configures; the "today" case (no id) is the default argument, which must be null.
const ID = "G-TEST1234";

const scripts = () => document.querySelectorAll(`script[${GTAG_SCRIPT_ATTR}]`);
const gaScripts = () => [...document.querySelectorAll("script")].filter((s) => s.src.includes("googletagmanager"));
/** Every gtag call, as plain arrays (gtag pushes the `arguments` object). */
const calls = () => (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));
const events = () => calls().filter((c) => c[0] === "event");

beforeEach(() => {
  window.localStorage.clear();
  resetAnalyticsForTests();
});
afterEach(() => {
  window.localStorage.clear();
  resetAnalyticsForTests();
  document.cookie.split(";").forEach((c) => {
    document.cookie = `${c.split("=")[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
});

describe("with no GA4 id (the shipped state)", () => {
  it("the build has no id configured", () => {
    expect(GA4_ID).toBeNull();
  });

  it("every call is a no-op: no script, no gtag, no storage write, no cookie, no prompt", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    initAnalytics();
    setConsent("granted");
    setConsent("denied");
    track("cta_click", { cta: "header_cta" });
    trackLead("contact", "google");
    trackPageView("/contact");
    const a = document.createElement("a");
    a.setAttribute("data-track-cta", "header_cta");
    trackClick(a);

    expect(scripts()).toHaveLength(0);
    expect(gaScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    expect(document.cookie).toBe("");
    expect(needsConsentPrompt()).toBe(false);
    expect(isAnalyticsLoaded()).toBe(false);
  });

  it("does not even pass an explicit null id through", () => {
    setConsent("granted", null);
    expect(scripts()).toHaveLength(0);
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });
});

describe("with an id and no consent", () => {
  it("asks for consent and loads nothing", () => {
    initAnalytics(ID);
    expect(needsConsentPrompt(ID)).toBe(true);
    expect(scripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
    track("cta_click", { cta: "header_cta" });
    expect(window.dataLayer).toBeUndefined();
  });

  it("treats an unknown stored value as no choice", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "maybe");
    expect(getStoredConsent()).toBeNull();
    initAnalytics(ID);
    expect(scripts()).toHaveLength(0);
  });
});

describe("Accept", () => {
  it("stores the choice and injects the gtag script once, for that id, with Consent Mode v2 and the privacy flags", () => {
    setConsent("granted", ID);
    setConsent("granted", ID);
    initAnalytics(ID);

    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("granted");
    expect(scripts()).toHaveLength(1);
    const s = scripts()[0] as HTMLScriptElement;
    expect(s.src).toBe("https://www.googletagmanager.com/gtag/js?id=G-TEST1234");
    expect(s.async).toBe(true);

    const c = calls();
    // Defaults first, all denied...
    expect(c[0]).toEqual([
      "consent",
      "default",
      { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" },
    ]);
    // ...then only analytics storage granted.
    expect(c[1]).toEqual(["consent", "update", { analytics_storage: "granted" }]);
    const config = c.find((x) => x[0] === "config");
    expect(config).toEqual([
      "config",
      ID,
      {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        send_page_view: false,
        page_location: `${window.location.origin}${window.location.pathname}`,
        page_referrer: "",
      },
    ]);
    expect(c.filter((x) => x[0] === "config")).toHaveLength(1);
    expect(needsConsentPrompt(ID)).toBe(false);
  });

  it("loads on a later visit from the stored choice", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "granted");
    initAnalytics(ID);
    expect(scripts()).toHaveLength(1);
  });

  it("sends page_view with the path only, never the query string or hash", () => {
    setConsent("granted", ID);
    trackPageView("/contact?email=ada@example.com#x");
    const [, name, params] = events()[0];
    expect(name).toBe("page_view");
    expect(params).toMatchObject({ page_path: "/contact", page_location: `${window.location.origin}/contact` });
    expect(JSON.stringify(params)).not.toContain("ada");
  });
});

describe("gtag never sees a query string or fragment (STS-070)", () => {
  const original = window.location.pathname;
  afterEach(() => window.history.replaceState({}, "", original));

  it("cleanLocation keeps origin + path only", () => {
    expect(cleanLocation("/contact?email=ada@example.com#t")).toBe(`${window.location.origin}/contact`);
    expect(cleanLocation("https://ref.example/p?q=ada#x")).toBe("https://ref.example/p");
  });

  it("the referrer is cut to its origin: its path could carry an email (A5-3)", () => {
    expect(referrerOrigin("https://ref.example/p/bob@x.com?q=1#y")).toBe("https://ref.example");
    expect(referrerOrigin("android-app://com.example")).toBe("");
    expect(referrerOrigin("not a url")).toBe("");
  });

  it("config, set and page_view carry no ?, # or email when the page URL has them", () => {
    window.history.pushState({}, "", "/contact?email=ada@example.com#t");
    setConsent("granted", ID);
    trackPageView(`${window.location.pathname}${window.location.search}${window.location.hash}`);

    const c = calls();
    const config = c.find((x) => x[0] === "config")!;
    expect((config[2] as Record<string, unknown>).page_location).toBe(`${window.location.origin}/contact`);
    const set = c.find((x) => x[0] === "set")!;
    expect(set[1]).toEqual({ page_location: `${window.location.origin}/contact`, page_referrer: "" });

    for (const x of c.filter((y) => y[0] === "config" || y[0] === "set" || y[0] === "event")) {
      const sent = JSON.stringify(x);
      expect(sent).not.toContain("?");
      expect(sent).not.toContain("#");
      expect(sent).not.toContain("ada");
    }
  });
});

describe("Decline", () => {
  it("is remembered and nothing loads, now or on the next visit", () => {
    setConsent("denied", ID);
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("denied");
    expect(scripts()).toHaveLength(0);

    resetAnalyticsForTests(); // a reload: module state gone, storage kept
    initAnalytics(ID);
    expect(needsConsentPrompt(ID)).toBe(false);
    expect(scripts()).toHaveLength(0);
    track("generate_lead", { form: "contact" });
    expect(window.dataLayer).toBeUndefined();
  });

  it("after Accept, a Decline on the same page stops every later send before any reload (A5-1)", () => {
    setConsent("granted", ID);
    trackPageView("/services");
    const before = calls().length;
    setConsent("denied", ID);
    const afterDecline = calls().length;
    expect(calls().at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);

    track("generate_lead", { form: "contact" });
    track("cta_click", { cta: "header_cta" });
    trackPageView("/contact");
    expect(calls()).toHaveLength(afterDecline);
    expect(afterDecline).toBe(before + 1);

    // STS-076: Google's own opt-out is set too, so gtag.js stops its automatic events as well.
    expect((window as unknown as Record<string, unknown>)[gaDisableKey(ID)]).toBe(true);

    // Accepting again on the same page re-grants storage, does not inject a second script, and sends again.
    setConsent("granted", ID);
    expect((window as unknown as Record<string, unknown>)[gaDisableKey(ID)]).toBe(false);
    expect(calls().at(-1)).toEqual(["consent", "update", { analytics_storage: "granted" }]);
    expect(scripts()).toHaveLength(1);
    track("cta_click", { cta: "header_cta" });
    expect(calls().at(-1)).toEqual(["event", "cta_click", { cta: "header_cta" }]);
  });
});

describe("events carry only allow-listed parameters (no PII)", () => {
  const PII = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+16145550100",
    message: "Call me at 614-555-0100",
    source: "my friend Bob at bob@example.com",
    company: "Ada Bakery",
    website: "https://ada.example",
  };

  beforeEach(() => setConsent("granted", ID));

  it("drops every PII-looking extra field from generate_lead", () => {
    track("generate_lead", { form: "contact", lead_source: "referral", ...PII });
    const [, name, params] = events()[0];
    expect(name).toBe("generate_lead");
    expect(params).toEqual({ form: "contact", lead_source: "referral" });
    const sent = JSON.stringify(calls());
    for (const v of Object.values(PII)) expect(sent).not.toContain(v);
  });

  it("drops a lead_source or form that is not in its fixed enum (free text cannot get through)", () => {
    track("generate_lead", { form: "newsletter", lead_source: "ada@example.com" });
    expect(events()[0][2]).toEqual({});
    trackLead("audit", "Bob told me");
    expect(events()[1][2]).toEqual({ form: "audit" });
  });

  it("accepts each of the five lead sources and nothing else", () => {
    for (const s of LEAD_SOURCES) expect(sanitizeParams("generate_lead", { form: "audit", lead_source: s })).toEqual({ form: "audit", lead_source: s });
    expect(sanitizeParams("generate_lead", { lead_source: "Google" })).toEqual({});
  });

  it("refuses an event that is not in the schema", () => {
    expect(sanitizeParams("purchase", { value: 1 })).toBeNull();
    track("purchase" as never, { email: PII.email });
    expect(events()).toHaveLength(0);
  });

  it("cta_click only with a fixed cta id", () => {
    for (const id of CTA_IDS) expect(sanitizeParams("cta_click", { cta: id, label: "Book a Free Consultation" })).toEqual({ cta: id });
    expect(sanitizeParams("cta_click", { cta: "https://calendly.com/x?email=a@b.c" })).toEqual({});
  });
});

describe("click mapping", () => {
  beforeEach(() => setConsent("granted", ID));

  it("a tracked CTA (or a child of it) sends cta_click with its id", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/contact");
    a.setAttribute("data-track-cta", "hero_consultation");
    const span = document.createElement("span");
    a.appendChild(span);
    expect(trackClick(span)).toBe("cta_click");
    expect(events()[0]).toEqual(["event", "cta_click", { cta: "hero_consultation" }]);
  });

  it("tel:, sms: and mailto: links send contact_click with the method, never the number or address", () => {
    const link = (href: string, location?: string) => {
      const a = document.createElement("a");
      a.setAttribute("href", href);
      if (location) a.setAttribute("data-cta-location", location);
      return a;
    };
    trackClick(link("tel:+16145550100", "header"));
    trackClick(link("sms:+16145550100", "menu"));
    trackClick(link("mailto:hello@example.com", "somewhere-else"));
    expect(events().map((e) => e.slice(1))).toEqual([
      ["contact_click", { method: "phone", location: "header" }],
      ["contact_click", { method: "sms", location: "menu" }],
      ["contact_click", { method: "email" }],
    ]);
    const sent = JSON.stringify(calls());
    expect(sent).not.toContain("6145550100");
    expect(sent).not.toContain("hello@example.com");
  });

  it("an ordinary link sends nothing", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/about");
    expect(trackClick(a)).toBeNull();
    expect(events()).toHaveLength(0);
  });
});
