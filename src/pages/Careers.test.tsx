import { describe, it, expect } from "vitest";
import { render as renderDom, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render } from "@/entry-server";
import Careers from "./Careers";
import careersData from "../../data/careers.json";
import { CAREERS_FORBIDDEN_PHRASES, buildRoutes } from "../../tests/smoke/smoke.mjs";

// STS-056 (GAP-11). /careers is rendered exactly as the build prerenders it, then read as a document.
const html = render("/careers");
const doc = new DOMParser().parseFromString(html, "text/html");
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("Careers page has no dead control (STS-056, GAP-11)", () => {
  it("renders no <button> at all: there is nothing on the page a button could do", () => {
    expect(main.querySelectorAll("button")).toHaveLength(0);
  });

  it("no longer offers an \"Apply Now\" that goes nowhere, and the smoke test guards the built page", () => {
    expect(text(main)).not.toMatch(/apply now/i);
    expect(buildRoutes().find((r) => r.path === "/careers")?.forbidText).toEqual(CAREERS_FORBIDDEN_PHRASES);
    for (const p of CAREERS_FORBIDDEN_PHRASES) expect(html.toLowerCase()).not.toContain(p.toLowerCase());
  });

  it("gives every listed role one link to /contact, named after the role", () => {
    const links = [...main.querySelectorAll("a")].filter((a) => text(a).startsWith("Ask about this role"));
    expect(links).toHaveLength(careersData.length);
    links.forEach((a, i) => {
      expect(a.getAttribute("href")).toBe("/contact");
      expect(text(a)).toBe(`Ask about this role: ${careersData[i].title}`);
    });
  });

  it("sends the closing call to action to /contact as one link, not a button nested in a link", () => {
    const cta = [...main.querySelectorAll("a")].filter((a) => text(a) === "Get In Touch");
    expect(cta).toHaveLength(1);
    expect(cta[0].getAttribute("href")).toBe("/contact");
    expect(main.querySelector("a button, a a")).toBeNull();
  });

  it("navigates to the contact page when a role's link is activated", async () => {
    renderDom(
      <MemoryRouter initialEntries={["/careers"]}>
        <Routes>
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<p>contact page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    // jsdom has no layout, so it joins the sr-only span with a space ("role : title"); browsers do not.
    const name = new RegExp(`^Ask about this role\\s*:\\s*${careersData[0].title}$`);
    await userEvent.click(screen.getByRole("link", { name }));
    expect(screen.getByText("contact page")).toBeInTheDocument();
  });
});
