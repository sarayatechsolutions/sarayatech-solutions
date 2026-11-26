import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppProviders } from "./App";
import { AppRoutes, getPublicPaths } from "./routes";

/**
 * STS-056 (GAP-11): no live page may carry a control that does nothing.
 *
 * Every routed page is mounted in the browser environment (not the static HTML, which drops event
 * handlers), on first paint, before the lazily loaded chatbot. Then:
 *  - every <button> submits a form, or has a click handler, or controls another element;
 *  - every link has a real destination: no "#", no empty href, no empty tel:/mailto:, no javascript:;
 *  - every internal link points to a routed page.
 *
 * A click handler is read from the props React attached to the element. If a React upgrade ever
 * stops exposing them, every handler-only button fails here loudly; nothing passes by accident.
 */
const reactProps = (el: Element): Record<string, unknown> => {
  const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  return key ? ((el as unknown as Record<string, Record<string, unknown>>)[key] ?? {}) : {};
};

const describeEl = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").replace(/\s+/g, " ").trim()}"`;

function deadButtons(root: HTMLElement): string[] {
  return [...root.querySelectorAll("button")]
    .filter((b) => {
      if (b.closest("form") && (b.getAttribute("type") ?? "submit") === "submit") return false;
      if (typeof reactProps(b).onClick === "function") return false;
      if (b.hasAttribute("aria-controls")) return false;
      return true;
    })
    .map(describeEl);
}

const routed = new Set(getPublicPaths());

function deadLinks(root: HTMLElement): string[] {
  return [...root.querySelectorAll("a")]
    .filter((a) => {
      const href = (a.getAttribute("href") ?? "").trim();
      if (href === "" || href === "#" || /^javascript:/i.test(href)) return true;
      if (/^(tel|mailto):\s*$/i.test(href)) return true;
      if (href.startsWith("/")) {
        const path = href.split(/[?#]/)[0];
        return !routed.has(path);
      }
      return false;
    })
    .map((a) => `${describeEl(a)} -> ${JSON.stringify(a.getAttribute("href"))}`);
}

describe("no dead control on any live page (STS-056, GAP-11)", () => {
  it.each(getPublicPaths())("%s", (path) => {
    const { container } = render(
      <AppProviders>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>,
    );
    // The page actually rendered (not the 404 catch-all), so the checks below looked at it.
    expect(container.querySelector("main h1")).not.toBeNull();
    expect(container.querySelector("main")?.textContent).not.toContain("Oops! Page not found");
    expect(deadButtons(container)).toEqual([]);
    expect(deadLinks(container)).toEqual([]);
  });

  it("would catch the old Careers \"Apply Now\": a button with no handler, outside any form", () => {
    const { container } = render(
      <div>
        <button>Apply Now</button>
        <a href="#">Read Article</a>
        <a href="mailto:">Email</a>
        <a href="/nowhere">Gone</a>
      </div>,
    );
    expect(deadButtons(container)).toEqual(['button "Apply Now"']);
    expect(deadLinks(container)).toHaveLength(3);
  });
});
