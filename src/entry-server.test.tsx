import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { render, paths, NOT_FOUND_PATH } from "./entry-server";
import { getPublicPaths } from "./routes";
import App from "./App";

function h1Of(html: string): string | null {
  const m = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return m ? m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : null;
}

describe("prerender entry (STS-020)", () => {
  it("prerenders every public route, with dynamic detail pages expanded", () => {
    expect(paths).toEqual(getPublicPaths());
    expect(paths).toEqual(
      expect.arrayContaining(["/", "/about", "/contact", "/services", "/our-work", "/insights", "/careers"]),
    );
    expect(paths.filter((p) => p.startsWith("/services/")).length).toBe(5);
    // STS-039: the enterprise solution and industry pages are retired (301s), never prerendered.
    expect(paths.filter((p) => /^\/(solutions|industries|industry)(\/|$)/.test(p))).toEqual([]);
    expect(paths).not.toContain("/auth");
    expect(paths).not.toContain("/dashboard");
  });

  it.each(paths)("renders a real <h1> into the HTML for %s", (p) => {
    const h1 = h1Of(render(p));
    expect(h1).toBeTruthy();
    expect(h1).not.toMatch(/not found/i);
  });

  it("renders the 404 page for a path that matches no route", () => {
    const html = render(NOT_FOUND_PATH);
    // Design audit B7 (section 5 copy): the h1 was "404" and the text "Oops! Page not found".
    expect(h1Of(html)).toBe("We can&#x27;t find that page"); // h1Of reads raw HTML: React escapes the apostrophe
    expect(html).toContain("Error 404");
  });

  it("does not render the client-only chatbot into the HTML", () => {
    expect(render("/")).not.toMatch(/open chat/i);
  });

  it("hydrates the prerendered markup without a mismatch", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    window.history.pushState({}, "", "/about");
    const container = document.createElement("div");
    container.innerHTML = render("/about");
    document.body.appendChild(container);
    await act(async () => {
      hydrateRoot(container, <App />);
    });
    const hydrationErrors = errors.mock.calls.filter((c) => /Hydration failed|did not match|hydrated but some attributes|error while hydrating/i.test(String(c[0])));
    expect(hydrationErrors).toEqual([]);
    expect(container.querySelector("h1")?.textContent).toBe("Your neighbors in tech"); // About h1 (STS-036)
  });
});
