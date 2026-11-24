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
    expect(names).toEqual(["Home", "Solutions", "Industries", "Our Work", "About"]);
    expect(within(nav).getByRole("link", { name: "Our Work" })).toHaveAttribute("href", "/realisation");
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

  it("highlights the section on a detail page without claiming it is the current page", () => {
    renderAt("/solutions/web-mobile-development");
    const solutions = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Solutions" });
    expect(solutions).toHaveClass("text-primary");
    expect(solutions).not.toHaveAttribute("aria-current");
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
    expect(within(menu as HTMLElement).getByRole("link", { name: "Our Work" })).toHaveAttribute("href", "/realisation");

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });
});

describe("Header once the owner fills the business config (STS-038)", () => {
  it("shows a labelled tel: action and the verified booking CTA", () => {
    renderAt("/", <Header config={POPULATED_CONFIG} />);
    expect(screen.getByRole("link", { name: "Call (555) 010-0199" })).toHaveAttribute("href", "tel:+15550100199");

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
    expect(screen.getByRole("link", { name: "Call (555) 010-0199" })).toBeInTheDocument();
    expect(document.querySelector('a[href*="booking.example.com"]')).toBeNull();
  });
});
