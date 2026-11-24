import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import MarkdownRenderer from "./MarkdownRenderer";

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderMd(content: string, onLinkClick = vi.fn()) {
  const utils = render(
    <MemoryRouter initialEntries={["/"]}>
      <MarkdownRenderer content={content} onLinkClick={onLinkClick} />
      <LocationProbe />
    </MemoryRouter>,
  );
  return { ...utils, onLinkClick, location: () => screen.getByTestId("location").textContent };
}

// jsdom cannot follow a real navigation; stop the browser default AFTER React has handled the
// click, and record whether the app itself prevented it (i.e. routed it in-app).
function clickAndReport(el: Element): Promise<{ appPrevented: boolean }> {
  return new Promise((resolve) => {
    const listener = (e: Event) => {
      const appPrevented = e.defaultPrevented;
      e.preventDefault();
      window.removeEventListener("click", listener);
      resolve({ appPrevented });
    };
    window.addEventListener("click", listener);
    void userEvent.setup().click(el);
  });
}

describe("MarkdownRenderer safety", () => {
  it("never renders raw HTML from a reply", () => {
    const { container } = renderMd('Hi <img src="x" onerror="alert(1)"> <script>alert(2)</script>');
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
  });

  it("renders javascript:, data:, vbscript: and mailto: links from a reply as plain text, not links", () => {
    const { container } = renderMd(
      "[alpha](javascript:alert(1)) [bravo](data:text/html,<b>x</b>) [charlie](vbscript:x) [delta](mailto:a@b.c)",
    );
    expect(container.querySelectorAll("a")).toHaveLength(0);
    for (const label of ["alpha", "bravo", "charlie", "delta"]) {
      expect(screen.getByText(label).closest("a")).toBeNull();
    }
    expect(container.innerHTML).not.toMatch(/javascript:|data:text|vbscript:|mailto:/i);
  });
});

describe("MarkdownRenderer links (STS-058 / REQ-154)", () => {
  it("does not route a protocol-relative //evil.tld link internally", async () => {
    const { onLinkClick, location } = renderMd("[Contact us](//evil.tld/contact)");
    const link = screen.getByRole("link", { name: /contact us/i });

    expect(link).toHaveAttribute("href", "https://evil.tld/contact");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")?.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));

    const { appPrevented } = await clickAndReport(link);
    expect(appPrevented).toBe(false);
    expect(location()).toBe("/");
    expect(onLinkClick).not.toHaveBeenCalled();
  });

  it("routes /contact internally, without a new tab, and closes the chat", async () => {
    const { onLinkClick, location } = renderMd("Use our [contact form](/contact).");
    const link = screen.getByRole("link", { name: "contact form" });

    expect(link).toHaveAttribute("href", "/contact");
    expect(link).not.toHaveAttribute("target");

    const { appPrevented } = await clickAndReport(link);
    expect(appPrevented).toBe(true);
    expect(location()).toBe("/contact");
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });

  it("renders https://x as an external new-tab link with noopener noreferrer", async () => {
    const { onLinkClick, location } = renderMd("[site](https://x)");
    const link = screen.getByRole("link", { name: /site/i });

    expect(link).toHaveAttribute("href", "https://x/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")?.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    expect(link).toHaveTextContent("(opens in a new tab)");

    const { appPrevented } = await clickAndReport(link);
    expect(appPrevented).toBe(false);
    expect(location()).toBe("/");
    expect(onLinkClick).not.toHaveBeenCalled();
  });

  // Security review integrate/s2 (MEDIUM): "/.//evil.example" used to render as
  // <a href="//evil.example"> with no target, so a middle-click or "open in new tab" left the site.
  it("never renders a dot-segment link as a protocol-relative or off-origin same-tab href", () => {
    const payloads = [
      "/.//evil.example",
      "/..//evil.example",
      "/a/..//evil.example",
      "/%2e//evil.example",
      "/%2E//evil.example",
      "/./\\evil.example",
    ];
    const { container } = renderMd(payloads.map((p, i) => `[link${i}](${p})`).join(" "));

    for (const a of Array.from(container.querySelectorAll("a"))) {
      const href = a.getAttribute("href") ?? "";
      expect(href).not.toMatch(/^[/\\]{2}/);
      // Anything that resolves off this origin must at least be a marked new-tab external link.
      if (new URL(href, window.location.href).origin !== window.location.origin) {
        expect(a).toHaveAttribute("target", "_blank");
      }
    }
    // The five forward-slash payloads must not be links at all. The backslash one is the
    // exception: react-markdown percent-encodes a raw "\" in a destination to "%5C", so it
    // reaches classifyHref as "/./%5Cevil.example" and normalises to the same-origin path
    // "/%5Cevil.example" (the URL parser never decodes %5C into a separator). That is covered
    // by the invariants above; the raw-backslash form is covered in links.test.ts.
    payloads.slice(0, 5).forEach((_, i) => {
      expect(screen.getByText(`link${i}`).closest("a")).toBeNull();
    });
    expect(screen.getByText("link5").closest("a")?.getAttribute("href")).toBe("/%5Cevil.example");
    expect(container.innerHTML).not.toMatch(/["'][/\\]{2}evil\.example/);
  });

  it("gives no link a calendly special case", () => {
    const { container } = renderMd("[book](https://calendly.com/saraya-info) [site](https://x)");
    const [calendly, other] = Array.from(container.querySelectorAll("a"));
    expect(calendly.className).toBe(other.className);
  });
});

describe("MarkdownRenderer code", () => {
  it("renders a fenced block as plain <pre><code> keeping the text", () => {
    const { container } = renderMd("```ts\nconst a = 1;\n```");
    const code = container.querySelector("pre > code");
    expect(code).not.toBeNull();
    expect(code).toHaveTextContent("const a = 1;");
    expect(code).toHaveAttribute("data-language", "ts");
  });

  it("renders inline code without a <pre> wrapper", () => {
    const { container } = renderMd("run `npm test` now");
    expect(container.querySelector("pre")).toBeNull();
    expect(container.querySelector("code")).toHaveTextContent("npm test");
  });
});
