import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import Contact from "@/pages/Contact";

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

// While BUSINESS holds the 06 fallbacks, no consumer may show these.
function expectNoUnconfirmedFacts(container: HTMLElement) {
  const html = container.innerHTML;
  const text = container.textContent ?? "";
  expect(container.querySelector('a[href^="tel:"]')).toBeNull();
  expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  expect(container.querySelector('a[href="#"]')).toBeNull();
  expect(container.querySelector('a[href*="calendly"]')).toBeNull();
  expect(html).not.toMatch(/783-0443|614/);
  expect(text).not.toMatch(/Hamilton|43232|2765/i);
  expect(text).not.toMatch(/Call us/i);
  // The contact form has its own "Phone Number" input label; only the info-block heading is banned.
  expect([...container.querySelectorAll("div")].some((d) => d.textContent?.trim() === "Phone")).toBe(false);
  expect(text).not.toMatch(/info@/i);
  expect(container.querySelector("iframe")).toBeNull();
}

describe("business-config consumers with unconfirmed facts", () => {
  it("Header: no phone, no street address, no calendly; CTA goes to /contact", () => {
    const { container, getAllByRole } = wrap(<Header />);
    expectNoUnconfirmedFacts(container);
    expect(getAllByRole("link", { name: "Contact Us" })[0]).toHaveAttribute("href", "/contact");
    expect(container.textContent).not.toMatch(/Book a Meeting/);
  });

  it("Footer: service area instead of address, no phone/email/social stubs", () => {
    const { container, getByText } = wrap(<Footer />);
    expectNoUnconfirmedFacts(container);
    expect(getByText("Serving Columbus, OH and central Ohio")).toBeInTheDocument();
  });

  it("Contact: service area only; no phone, email, hours, map or calendly", () => {
    const { container, getByText } = wrap(<Contact />);
    expectNoUnconfirmedFacts(container);
    expect(getByText("Serving Columbus, OH and central Ohio")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Business Hours|Monday/);
  });

  it("ErrorBoundary fallback points at the contact form, not an email", () => {
    const Boom = () => {
      throw new Error("boom");
    };
    const spy = console.error;
    console.error = () => {};
    try {
      const { container, getByRole } = render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );
      expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
      expect(getByRole("link", { name: "contact form" })).toHaveAttribute("href", "/contact");
    } finally {
      console.error = spy;
    }
  });
});
