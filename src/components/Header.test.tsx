import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Header, { MAIN_CONTENT_ID } from "./Header";
import { POPULATED_CONFIG } from "./chrome.fixtures";

const renderAt = (path: string, ui: React.ReactElement = <Header />) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe("Header with the default (unconfirmed) business config (STS-038)", () => {
  it("shows no phone, email, placeholder or unverified booking link", () => {
    const { container } = renderAt("/");
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(container.querySelector('a[href*="calendly"]')).toBeNull();
  });

  it("labels the CTA for its destination: Contact Us, to the contact form", () => {
    renderAt("/");
    const cta = screen.getByRole("link", { name: "Contact Us" });
    expect(cta).toHaveAttribute("href", "/contact");
    expect(cta).not.toHaveAttribute("target");
    expect(screen.queryByRole("link", { name: /Book/ })).toBeNull();
    // A link, not a button nested inside a link.
    expect(cta.querySelector("button")).toBeNull();
  });

  it("has a labelled main nav with Our Work instead of Realisation", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "Main" });
    const names = within(nav)
      .getAllByRole("link")
      .map((a) => a.textContent);
    expect(names).toEqual(["Home", "Services", "Our Work", "Pricing", "About"]);
    // STS-039: the retired /solutions and /industries are gone from the nav.
    expect(within(nav).getByRole("link", { name: "Services" })).toHaveAttribute("href", "/services");
    // STS-057: final URL scheme, and Pricing is in the main nav.
    expect(within(nav).getByRole("link", { name: "Our Work" })).toHaveAttribute("href", "/our-work");
    expect(within(nav).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    expect(document.body.textContent).not.toMatch(/Realisation/);
  });

  it("starts with a skip link to the main content", () => {
    renderAt("/");
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
    expect(document.querySelector("a")).toBe(skip);
  });

  it("names the logo link and marks the current page", () => {
    renderAt("/about");
    expect(screen.getByRole("link", { name: "SarayaTech Solutions home" })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("reserves the logo's box and draws no box or scale hack around it (design audit B2)", () => {
    renderAt("/");
    const logo = screen.getByRole("img", { name: "SarayaTech Solutions home" });
    expect(logo).toHaveAttribute("width", "989");
    expect(logo).toHaveAttribute("height", "373");
    const cls = (logo.getAttribute("class") ?? "").split(/\s+/);
    // 48 px tall from 380 px wide: 989/373 x 48 = 127 px, the audit's "at least 120 px at 390".
    expect(cls).toEqual(expect.arrayContaining(["w-auto", "min-[380px]:h-12"]));
    expect(cls.filter((c) => /(^|:)(scale-|bg-|border|shadow|p-|px-|py-)/.test(c))).toEqual([]);
  });

  it("highlights the section on a detail page as aria-current=true, never as the current page", () => {
    renderAt("/services/website-design");
    const services = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Services" });
    expect(services).toHaveClass("text-primary");
    expect(services).toHaveAttribute("aria-current", "true");
    expect(document.querySelector('[aria-current="page"]')).toBeNull();
  });
});

describe("Header active nav state, desktop and mobile (STS-057)", () => {
  const ITEMS = ["Home", "Services", "Our Work", "Pricing", "About"];

  /** aria-current of every main-nav link, in order, in the given nav. */
  const currentOf = (nav: HTMLElement) =>
    ITEMS.map((name) => within(nav).getByRole("link", { name }).getAttribute("aria-current"));

  async function openMobileMenu() {
    await userEvent.setup().click(screen.getByRole("button", { name: "Open menu" }));
    return document.getElementById("mobile-menu") as HTMLElement;
  }

  it.each([
    ["/", [ "page", null, null, null, null ]],
    ["/services", [ null, "page", null, null, null ]],
    ["/services/local-seo", [ null, "true", null, null, null ]],
    ["/our-work", [ null, null, "page", null, null ]],
    ["/our-work/", [ null, null, "page", null, null ]],
    ["/pricing", [ null, null, null, "page", null ]],
    ["/about", [ null, null, null, null, "page" ]],
    ["/contact", [ null, null, null, null, null ]],
  ])("at %s marks the right link on desktop and in the mobile menu", async (path, expected) => {
    renderAt(path);
    const desktop = screen.getAllByRole("navigation", { name: "Main" })[0];
    expect(currentOf(desktop)).toEqual(expected);
    const mobile = await openMobileMenu();
    expect(currentOf(mobile)).toEqual(expected);

    // The marked link is also styled active (not colour alone on mobile: a left bar too).
    const i = expected.findIndex((v) => v !== null);
    for (const [k, name] of ITEMS.entries()) {
      const d = within(desktop).getByRole("link", { name });
      const m = within(mobile).getByRole("link", { name });
      if (k === i) {
        expect(d).toHaveClass("text-primary");
        expect(m).toHaveClass("border-primary", "text-primary");
      } else {
        expect(d).not.toHaveClass("text-primary");
        expect(m).toHaveClass("border-transparent");
      }
    }
  });

  it("uses router links for every nav entry, so navigation never reloads the page", async () => {
    renderAt("/");
    const desktop = screen.getByRole("navigation", { name: "Main" });
    const mobile = await openMobileMenu();
    for (const nav of [desktop, mobile]) {
      for (const name of ITEMS) {
        const a = within(nav).getByRole("link", { name });
        expect(a.getAttribute("href")).toMatch(/^\/[a-z-]*$/);
        expect(a).not.toHaveAttribute("target");
      }
    }
  });

  it("opens and closes the mobile menu from a labelled toggle, and Escape returns focus", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Close menu");
    const menu = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(menu).not.toBeNull();
    expect(within(menu as HTMLElement).getByRole("link", { name: "Our Work" })).toHaveAttribute("href", "/our-work");
    expect(within(menu as HTMLElement).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });
});

describe("Header once the owner fills the business config (STS-038)", () => {
  it("shows a labelled tel: action and the verified booking CTA", () => {
    renderAt("/", <Header config={POPULATED_CONFIG} />);
    expect(screen.getByRole("link", { name: "Call SarayaTech Solutions at (555) 010-0199" })).toHaveAttribute("href", "tel:+15550100199");

    const cta = screen.getByRole("link", { name: "Book a Free Consultation (opens in a new tab)" });
    expect(cta).toHaveAttribute("href", "https://booking.example.com/free-consultation");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // The CTA no longer goes to the form, so the nav carries Contact.
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });

  it("keeps Contact Us while the booking link is unverified, even with a phone", () => {
    renderAt("/", <Header config={{ ...POPULATED_CONFIG, booking: { ...POPULATED_CONFIG.booking, verified: false } }} />);
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Call SarayaTech Solutions at (555) 010-0199" })).toBeInTheDocument();
    expect(document.querySelector('a[href*="booking.example.com"]')).toBeNull();
  });
});

describe("Header click-to-call and click-to-text from config (STS-045)", () => {
  const TEXTS_OK = { ...POPULATED_CONFIG, phone: { ...POPULATED_CONFIG.phone!, acceptsTexts: true } };

  async function openMobileMenu() {
    await userEvent.setup().click(screen.getByRole("button", { name: "Open menu" }));
    return document.getElementById("mobile-menu") as HTMLElement;
  }

  it("renders no call or text action, and no dead link, while C2 is not supplied (today)", async () => {
    const { container } = renderAt("/");
    await openMobileMenu();
    expect(container.querySelector('a[href^="tel:"], a[href^="sms:"]')).toBeNull();
    expect(container.querySelector("[data-cta]")).toBeNull();
    expect(screen.queryByRole("link", { name: /^(Call|Text) / })).toBeNull();
  });

  it("with a verified number: a tel: action in the bar and in the menu, E.164 href, named, 44 px, hooked for analytics", async () => {
    renderAt("/", <Header config={POPULATED_CONFIG} />);
    const bar = screen.getByRole("link", { name: "Call SarayaTech Solutions at (555) 010-0199" });
    expect(bar).toHaveAttribute("href", "tel:+15550100199");
    expect(bar).toHaveAttribute("data-cta", "phone_click");
    expect(bar).toHaveAttribute("data-cta-location", "header");
    expect(bar).toHaveClass("h-11", "min-w-11");
    for (const svg of bar.querySelectorAll("svg")) expect(svg).toHaveAttribute("aria-hidden", "true");

    const menu = await openMobileMenu();
    const inMenu = within(menu).getByRole("link", { name: "Call SarayaTech Solutions" });
    expect(inMenu).toHaveAttribute("href", "tel:+15550100199");
    expect(inMenu).toHaveAttribute("data-cta-location", "menu");
    expect(inMenu).toHaveClass("h-11");
    for (const svg of inMenu.querySelectorAll("svg")) expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("never offers sms: unless the owner confirmed the number receives texts", async () => {
    const { container } = renderAt("/", <Header config={POPULATED_CONFIG} />);
    await openMobileMenu();
    expect(container.querySelector('a[href^="sms:"]')).toBeNull();
    expect(screen.queryByRole("link", { name: /^Text / })).toBeNull();
  });

  it("with texts confirmed: an sms: action in the bar and in the menu, E.164 href, named and hooked", async () => {
    renderAt("/", <Header config={TEXTS_OK} />);
    const bar = screen.getByRole("link", { name: "Text SarayaTech Solutions at (555) 010-0199" });
    expect(bar).toHaveAttribute("href", "sms:+15550100199");
    expect(bar).toHaveAttribute("data-cta", "text_click");
    expect(bar).toHaveClass("h-11", "w-11");
    for (const svg of bar.querySelectorAll("svg")) expect(svg).toHaveAttribute("aria-hidden", "true");

    const menu = await openMobileMenu();
    const inMenu = within(menu).getByRole("link", { name: "Text SarayaTech Solutions" });
    expect(inMenu).toHaveAttribute("href", "sms:+15550100199");
    expect(inMenu).toHaveAttribute("data-cta", "text_click");
    expect(inMenu).toHaveAttribute("data-cta-location", "menu");
  });

  it("treats a number that is not E.164 as not supplied: no tel:, no sms:", () => {
    const bad = { ...TEXTS_OK, phone: { display: "(555) 010-0199", tel: "555-010-0199", acceptsTexts: true } };
    const { container } = renderAt("/", <Header config={bad} />);
    expect(container.querySelector('a[href^="tel:"], a[href^="sms:"]')).toBeNull();
  });

  it("keeps aria-current on the nav when the actions are present", async () => {
    renderAt("/pricing", <Header config={TEXTS_OK} />);
    const desktop = screen.getByRole("navigation", { name: "Main" });
    expect(within(desktop).getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
    const menu = await openMobileMenu();
    expect(within(menu).getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
  });
});
