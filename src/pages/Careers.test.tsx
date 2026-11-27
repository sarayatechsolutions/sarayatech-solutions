import { describe, it, expect } from "vitest";
import { render as renderDom, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, sitemapPaths } from "@/entry-server";
import { getSeo, isIndexable, renderHeadTags } from "@/seo/seo";
import Careers from "./Careers";
import careersData from "../../data/careers.json";
import { CAREERS } from "@/content/careers/careers";
import { CAREERS_FORBIDDEN_PHRASES, buildRoutes } from "../../tests/smoke/smoke.mjs";

// STS-056 (GAP-11) and design audit B0 (FD-01). /careers is rendered exactly as the build
// prerenders it, then read as a document. No role is confirmed (C20/C27), so the page applies the
// owner's fallback: one sentence, one link to the contact form, noindex, out of the sitemap.
const html = render("/careers");
const doc = new DOMParser().parseFromString(html, "text/html");
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("Careers page is the owner's no-roles fallback (design audit B0, FD-01)", () => {
  it("shows the audit's fallback sentence word for word under its own h1", () => {
    expect(text(main.querySelector("h1"))).toBe("Careers at SarayaTech");
    expect(CAREERS.body).toBe(
      "We're not hiring for specific roles right now. If you'd like to work with us, send your CV through the contact form.",
    );
    expect(text(main)).toContain(CAREERS.body);
  });

  it("renders no role, job type or salary from the retired role data", () => {
    const body = text(main);
    for (const role of careersData) {
      expect(body).not.toContain(role.title);
      expect(body).not.toContain(role.salary);
    }
    expect(body).not.toMatch(/\$\s?\d/);
    expect(body).not.toMatch(/full-time|salary|perks?\b/i);
  });

  it("is noindex and out of the sitemap", () => {
    expect(getSeo("/careers").noindex).toBe(true);
    expect(isIndexable("/careers")).toBe(false);
    expect(renderHeadTags(getSeo("/careers"))).toMatch(/<meta name="robots" content="noindex, follow" ?\/?>/);
    expect(sitemapPaths).not.toContain("/careers");
    expect(buildRoutes().find((r) => r.path === "/careers")?.noindex).toBe(true);
  });
});

describe("Careers page has no dead control (STS-056, GAP-11)", () => {
  it("renders no <button> at all: there is nothing on the page a button could do", () => {
    expect(main.querySelectorAll("button")).toHaveLength(0);
  });

  it("no longer offers an \"Apply Now\" that goes nowhere, and the smoke test guards the built page", () => {
    expect(text(main)).not.toMatch(/apply now/i);
    expect(buildRoutes().find((r) => r.path === "/careers")?.forbidText).toEqual(CAREERS_FORBIDDEN_PHRASES);
    for (const p of CAREERS_FORBIDDEN_PHRASES) expect(html.toLowerCase()).not.toContain(p.toLowerCase());
  });

  it("sends its one call to action to /contact as one link, not a button nested in a link", () => {
    const cta = [...main.querySelectorAll("a")].filter((a) => text(a) === CAREERS.cta);
    expect(cta).toHaveLength(1);
    expect(cta[0].getAttribute("href")).toBe("/contact");
    expect(main.querySelector("a button, a a")).toBeNull();
  });

  it("navigates to the contact page when the link is activated", async () => {
    renderDom(
      <MemoryRouter initialEntries={["/careers"]}>
        <Routes>
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<p>contact page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("link", { name: CAREERS.cta }));
    expect(screen.getByText("contact page")).toBeInTheDocument();
  });
});
