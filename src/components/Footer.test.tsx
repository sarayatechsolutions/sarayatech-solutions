import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CONSENT_BANNER } from "@/content/legal/consent";
import { CONSENT_SETTINGS_EVENT } from "@/lib/analytics";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";
import { POPULATED_CONFIG } from "./chrome.fixtures";
import { getPublicPaths } from "@/routes";

const renderFooter = (ui: React.ReactElement = <Footer />) => render(<MemoryRouter>{ui}</MemoryRouter>);

const hrefs = (container: HTMLElement) => [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

describe("Footer with the default (unconfirmed) business config (STS-038)", () => {
  it("shows the name and service area, and no phone, email, social or placeholder link", () => {
    const { container } = renderFooter();
    const nap = container.querySelector("address") as HTMLElement;
    expect(within(nap).getByText("SarayaTech Solutions")).toBeInTheDocument();
    expect(within(nap).getByText("Serving Columbus, OH and central Ohio")).toBeInTheDocument();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector('a[href*="calendly"]')).toBeNull();
    expect(screen.queryByRole("list", { name: /social media/ })).toBeNull();
  });

  it("shows the white logo cropped to its mark, with its box reserved and no scale hack (design audit B2)", () => {
    renderFooter();
    const logo = screen.getByRole("img", { name: "SarayaTech Solutions home" });
    expect(logo).toHaveAttribute("width", "300");
    expect(logo).toHaveAttribute("height", "200");
    const cls = (logo.getAttribute("class") ?? "").split(/\s+/);
    expect(cls).toEqual(expect.arrayContaining(["h-14", "w-[152px]", "object-cover", "object-[center_-18px]"]));
    // No "%" in the markup: /our-work forbids it (unsourced percentage claims, smoke WORK_FORBIDDEN_PHRASES).
    expect(cls.join(" ")).not.toContain("%");
    expect(cls.filter((c) => c.startsWith("scale-"))).toEqual([]);
  });

  it('has no href="#" and no empty href', () => {
    const { container } = renderFooter();
    for (const href of hrefs(container)) {
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
    }
  });

  it("links only to routes that exist in src/routes.tsx", () => {
    const { container } = renderFooter();
    const routed = new Set(getPublicPaths());
    const links = hrefs(container);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(routed, `footer link ${href}`).toContain(href);
  });

  it("shows the current year, not a hard-coded one", () => {
    renderFooter();
    const year = new Date().getFullYear();
    expect(screen.getByText(/All rights reserved/).textContent).toBe(`© ${year} SarayaTech Solutions. All rights reserved.`);
    if (year !== 2024) expect(document.body.textContent).not.toMatch(/2024/);
  });

  it("renders no newsletter form or other dead control", () => {
    const { container } = renderFooter();
    expect(container.querySelector("form, input, button, textarea, select")).toBeNull();
    expect(container.textContent).not.toMatch(/Subscribe|Stay Updated|Newsletter/i);
  });

  it('drops the banned "digital transformation" copy (REQ-012)', () => {
    const { container } = renderFooter();
    expect(container.textContent).not.toMatch(/digital transformation|transform your business/i);
  });

  it("labels the case-study page Our Work, never Realisation", () => {
    const { container } = renderFooter();
    expect(screen.getByRole("link", { name: "Our Work" })).toHaveAttribute("href", "/our-work");
    expect(container.textContent).not.toMatch(/Realisation|Case Studies/);
  });

  it("drops the links whose pages do not exist", () => {
    const { container } = renderFooter();
    // /privacy and /terms exist since STS-037 (see the test below); /cookies still does not.
    for (const dead of ["/newsroom", "/documentation", "/support", "/cookies"]) {
      expect(container.querySelector(`a[href="${dead}"]`)).toBeNull();
    }
  });

  it("links the Privacy Policy and Terms of Use in a Legal landmark (STS-037, REQ-046)", () => {
    renderFooter();
    const legal = screen.getByRole("navigation", { name: "Legal" });
    expect(within(legal).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(within(legal).getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms");
    const routed = new Set(getPublicPaths());
    expect(routed.has("/privacy") && routed.has("/terms")).toBe(true);
  });

  it("shows no Cookie settings control while no GA4 id is configured (STS-071)", () => {
    renderFooter();
    expect(screen.queryByRole("button", { name: CONSENT_BANNER.settingsLink })).toBeNull();
  });

  it("with a GA4 id, a Cookie settings button in the Legal landmark re-opens the banner (STS-071)", () => {
    renderFooter(<Footer analyticsId="G-TEST1234" />);
    const legal = screen.getByRole("navigation", { name: "Legal" });
    const button = within(legal).getByRole("button", { name: CONSENT_BANNER.settingsLink });
    expect(button).toHaveAttribute("type", "button");
    expect(button.className.split(/\s+/)).toContain("min-h-11");
    const heard = vi.fn();
    window.addEventListener(CONSENT_SETTINGS_EVENT, heard);
    fireEvent.click(button);
    window.removeEventListener(CONSENT_SETTINGS_EVENT, heard);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("labels its link groups as navigation landmarks", () => {
    renderFooter();
    expect(screen.getByRole("navigation", { name: "Services" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Company" })).toBeInTheDocument();
  });
});

describe("Footer once the owner fills the business config (STS-038)", () => {
  it("shows the address instead of the service area, plus tel: and mailto: links", () => {
    const { container } = renderFooter(<Footer config={POPULATED_CONFIG} />);
    const nap = container.querySelector("address") as HTMLElement;
    expect(within(nap).getByText("100 Example Street")).toBeInTheDocument();
    expect(within(nap).queryByText("Serving Columbus, OH and central Ohio")).toBeNull();
    expect(within(nap).getByRole("link", { name: "(555) 010-0199" })).toHaveAttribute("href", "tel:+15550100199");
    expect(within(nap).getByRole("link", { name: "hello@example.com" })).toHaveAttribute("href", "mailto:hello@example.com");
    expect(within(nap).getByText("Mon-Fri 9am-5pm")).toBeInTheDocument();
  });

  it("shows only the configured social links, labelled, opening safely in a new tab", () => {
    renderFooter(<Footer config={POPULATED_CONFIG} />);
    const list = screen.getByRole("list", { name: "SarayaTech Solutions on social media" });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://www.linkedin.com/company/example",
      "https://www.facebook.com/example",
    ]);
    const linkedin = within(list).getByRole("link", { name: "SarayaTech Solutions on LinkedIn (opens in a new tab)" });
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
