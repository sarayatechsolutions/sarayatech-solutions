import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import Analytics from "./Analytics";
import { MAIN_CONTENT_ID } from "@/components/Header";
import { CONSENT_BANNER } from "@/content/legal/consent";
import {
  CONSENT_SETTINGS_EVENT,
  CONSENT_STORAGE_KEY,
  GTAG_SCRIPT_ATTR,
  openConsentSettings,
  resetAnalyticsForTests,
} from "@/lib/analytics";

// STS-050 (REQ-043): the browser wiring and the consent banner, driven as a visitor would.
const ID = "G-TEST1234";
const scripts = () => document.querySelectorAll(`script[${GTAG_SCRIPT_ATTR}]`);
const anyGoogleScript = () => [...document.querySelectorAll("script")].some((s) => /googletagmanager|gtag/.test(s.src));
const events = () =>
  (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>)).filter((c) => c[0] === "event");

function mount(id: string | null, extra?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/services"]}>
      <main id={MAIN_CONTENT_ID} tabIndex={-1}>
        <a href="/contact" data-track-cta="header_cta">
          Contact Us
        </a>
        <a href="tel:+16145550100" data-cta-location="header">
          Call
        </a>
        {extra}
      </main>
      <Analytics id={id} />
    </MemoryRouter>,
  );
}

const banner = () => screen.queryByRole("region", { name: CONSENT_BANNER.heading });

beforeEach(() => {
  window.localStorage.clear();
  resetAnalyticsForTests();
});
afterEach(() => {
  window.localStorage.clear();
  resetAnalyticsForTests();
});

describe("no GA4 id (today)", () => {
  it("renders no banner, injects no script, writes no storage and tracks nothing on click", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const addListener = vi.spyOn(document, "addEventListener");
    mount(null);
    expect(banner()).toBeNull();
    expect(document.querySelector("[data-consent-banner]")).toBeNull();
    await userEvent.setup().click(screen.getByRole("link", { name: "Contact Us" }));
    expect(scripts()).toHaveLength(0);
    expect(anyGoogleScript()).toBe(false);
    expect(window.dataLayer).toBeUndefined();
    expect(setItem).not.toHaveBeenCalled();
    expect(addListener.mock.calls.filter(([type]) => type === "click")).toHaveLength(0);
  });

  it("the default (configured id) is null, so the real mount renders nothing", () => {
    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>,
    );
    expect(banner()).toBeNull();
    expect(scripts()).toHaveLength(0);
  });
});

describe("with an id, before any choice", () => {
  it("shows a named, non-modal banner with a privacy link and equal-weight 44 px buttons, and loads nothing", () => {
    mount(ID);
    const region = banner() as HTMLElement;
    expect(region).not.toBeNull();
    expect(region).not.toHaveAttribute("aria-modal");
    expect(region.getAttribute("role")).not.toBe("dialog");
    expect(within(region).getByRole("link", { name: CONSENT_BANNER.linkText })).toHaveAttribute("href", "/privacy");

    const accept = within(region).getByRole("button", { name: CONSENT_BANNER.accept });
    const decline = within(region).getByRole("button", { name: CONSENT_BANNER.decline });
    // Equal weight: the same classes on both, so the same size, colour and type.
    expect(accept.className).toBe(decline.className);
    expect(accept.className.split(/\s+/)).toContain("min-h-11");
    expect(scripts()).toHaveLength(0);
    expect(anyGoogleScript()).toBe(false);
  });

  it("is laid out clear of the chat launcher (fixed bottom-6 right-6, 64 px) at 320 px and up", () => {
    mount(ID);
    const cls = (banner() as HTMLElement).className.split(/\s+/);
    // Phone: full width but 112 px up, above the launcher's 88 px top edge.
    expect(cls).toEqual(expect.arrayContaining(["fixed", "inset-x-2", "bottom-28", "z-40"]));
    // sm+: bottom-left corner, max 28rem, so it ends before the launcher at the right.
    expect(cls).toEqual(expect.arrayContaining(["sm:inset-x-auto", "sm:left-6", "sm:bottom-6", "sm:max-w-md"]));
    expect(cls).not.toContain("right-0");
  });

  it("is reachable by keyboard and does not trap focus", async () => {
    const user = userEvent.setup();
    mount(ID);
    await user.tab(); // Contact Us
    await user.tab(); // Call
    await user.tab();
    expect(document.activeElement).toHaveTextContent(CONSENT_BANNER.linkText);
    await user.tab();
    expect(document.activeElement).toHaveTextContent(CONSENT_BANNER.accept);
    await user.tab();
    expect(document.activeElement).toHaveTextContent(CONSENT_BANNER.decline);
    await user.tab();
    expect(banner()?.contains(document.activeElement)).toBe(false);
  });

  it("a CTA click before consent sends nothing", async () => {
    mount(ID);
    await userEvent.setup().click(screen.getByRole("link", { name: "Contact Us" }));
    expect(window.dataLayer).toBeUndefined();
  });
});

describe("Accept", () => {
  it("injects the script once, hides the banner, moves focus to main, then tracks page views and clicks", async () => {
    const user = userEvent.setup();
    mount(ID);
    await user.click(screen.getByRole("button", { name: CONSENT_BANNER.accept }));

    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("granted");
    expect(scripts()).toHaveLength(1);
    expect((scripts()[0] as HTMLScriptElement).src).toBe(`https://www.googletagmanager.com/gtag/js?id=${ID}`);
    expect(banner()).toBeNull();
    expect(document.activeElement?.id).toBe(MAIN_CONTENT_ID);
    expect(events()[0]).toEqual(["event", "page_view", expect.objectContaining({ page_path: "/services" })]);

    await user.click(screen.getByRole("link", { name: "Contact Us" }));
    await user.click(screen.getByRole("link", { name: "Call" }));
    expect(events().slice(1)).toEqual([
      ["event", "cta_click", { cta: "header_cta" }],
      ["event", "contact_click", { method: "phone", location: "header" }],
    ]);
  });

  it("a later visit loads straight away, with no banner and still one script", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "granted");
    const first = mount(ID);
    first.unmount();
    mount(ID);
    expect(banner()).toBeNull();
    expect(scripts()).toHaveLength(1);
  });
});

describe("Decline", () => {
  it("is remembered: no script now, and no banner and no script after a reload", async () => {
    const user = userEvent.setup();
    const first = mount(ID);
    await user.click(screen.getByRole("button", { name: CONSENT_BANNER.decline }));
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("denied");
    expect(banner()).toBeNull();
    expect(scripts()).toHaveLength(0);
    first.unmount();

    resetAnalyticsForTests(); // reload: module state gone, storage kept
    mount(ID);
    expect(banner()).toBeNull();
    expect(scripts()).toHaveLength(0);
    await user.click(screen.getByRole("link", { name: "Contact Us" }));
    expect(window.dataLayer).toBeUndefined();
  });
});

describe("Cookie settings: change or withdraw a choice (STS-071)", () => {
  it("re-opens the banner and moves focus to it; Decline then withdraws an earlier Accept and deletes the _ga cookies", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "granted");
    mount(ID);
    expect(banner()).toBeNull();
    expect(scripts()).toHaveLength(1);
    document.cookie = "_ga=GA1.1.123.456; path=/";
    document.cookie = "_ga_TEST1234=GS1.1.789; path=/";
    document.cookie = "keep_me=1; path=/";

    act(() => openConsentSettings(ID));
    const region = await screen.findByRole("region", { name: CONSENT_BANNER.heading });
    await waitFor(() => expect(document.activeElement).toBe(region));

    await user.click(screen.getByRole("button", { name: CONSENT_BANNER.decline }));
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("denied");
    expect(banner()).toBeNull();
    const consent = (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>)).filter((c) => c[0] === "consent");
    expect(consent.at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);
    expect(document.cookie).not.toMatch(/_ga/);
    expect(document.cookie).toContain("keep_me=1");

    // A5-1: gtag.js is still on the page until a reload, but nothing more is handed to it.
    const sent = (window.dataLayer ?? []).length;
    await user.click(screen.getByRole("link", { name: "Contact Us" }));
    await user.click(screen.getByRole("link", { name: "Call" }));
    expect((window.dataLayer ?? []).length).toBe(sent);
  });

  it("does nothing with no id configured", () => {
    mount(null);
    act(() => openConsentSettings(null));
    window.dispatchEvent(new Event(CONSENT_SETTINGS_EVENT));
    expect(banner()).toBeNull();
  });
});
