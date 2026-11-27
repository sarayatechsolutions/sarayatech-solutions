import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NotFound from "./NotFound";
import { NOT_FOUND } from "@/content/not-found/not-found";
import { getPublicPaths } from "@/routes";
import { getSeo } from "@/seo/seo";
import { render as renderStatic } from "@/entry-server";

const renderAt = (path = "/no-such-page") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>home page</p>} />
        <Route path="/services" element={<p>services page</p>} />
        <Route path="/contact" element={<p>contact page</p>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );

// STS-057: internal navigation goes through the router. A plain <a href="/"> reloads the whole app;
// in a MemoryRouter it does not navigate at all, so these tests fail if a link stops being a Link.
describe("404 page", () => {
  it("returns home through the router, without a page reload", async () => {
    renderAt();
    // Design audit B7: "Return to Home" became "Go to the home page" (one of three ways on).
    const home = screen.getByRole("link", { name: NOT_FOUND.links.home.label });
    expect(home).toHaveAttribute("href", "/");
    await userEvent.setup().click(home);
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  // Design audit B7: one h1, one helper sentence, three working links, and the noindex kept.
  it("says what happened in one h1 and offers three routed ways on (B7)", async () => {
    renderAt();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("We can't find that page");
    expect(screen.queryByText(/Oops/)).not.toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/", "/services", "/contact"]);
    for (const href of ["/", "/services", "/contact"]) expect(getPublicPaths()).toContain(href);
    await userEvent.setup().click(screen.getByRole("link", { name: NOT_FOUND.links.services.label }));
    expect(screen.getByText("services page")).toBeInTheDocument();
  });

  it("no longer logs a visitor's typo as an error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderAt();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("keeps its noindex, and the prerendered 404 uses design tokens, not raw gray", () => {
    expect(getSeo("/no-such-page").noindex).toBe(true);
    const html = renderStatic("/__not-found__");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const section = doc.querySelector("[data-not-found]") as HTMLElement;
    expect(section).not.toBeNull();
    expect(section.outerHTML).not.toMatch(/\b(?:bg|text)-gray-/);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
  });
});
