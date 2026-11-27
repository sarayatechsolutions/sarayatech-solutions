import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Block, InlineText } from "./PostBody";

// Security addendum 7, A7-2: post-body links go through one scheme allow-list (postLinkTarget).
const BS = String.fromCharCode(92); // a literal backslash, kept out of string escapes

const Where = () => <output data-testid="where">{useLocation().pathname}</output>;

function mount(text: string) {
  return render(
    <MemoryRouter initialEntries={["/insights/a-post"]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <p data-testid="body">
                <InlineText text={text} />
              </p>
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("InlineText link policy (A7-2)", () => {
  it.each([
    ["javascript:", "javascript:alert%281%29"],
    ["mixed-case javascript:", "JaVaScRiPt:alert%281%29"],
    ["data:", "data:text/html,<script>alert%281%29</script>"],
    ["vbscript:", "vbscript:msgbox"],
    ["protocol-relative", "//evil.example/x"],
    ["backslash host", `/${BS}evil.example`],
    ["double backslash host", `${BS}${BS}evil.example`],
    ["dot-segment host", "/.//evil.example"],
    ["http:", "http://example.com"],
    ["mailto:", "mailto:a@example.com"],
    ["relative path", "services"],
  ])("renders a %s link as its label in plain text, with no <a>", (_name, href) => {
    mount(`Before [click](${href}) after.`);
    const body = screen.getByTestId("body");
    expect(body.querySelector("a")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(body.textContent).toBe("Before click after.");
  });

  it("never emits the raw href even when a script URL contains a parenthesis", () => {
    mount("Before [click](javascript:alert(1)) after.");
    const body = screen.getByTestId("body");
    expect(body.querySelector("a")).toBeNull();
    expect(body.textContent).not.toMatch(/javascript/i);
  });

  it("routes /services with the router <Link>: same tab, no new-tab attributes, client-side navigation", async () => {
    mount("See [our services](/services).");
    const link = screen.getByRole("link", { name: "our services" });
    expect(link.getAttribute("href")).toBe("/services");
    expect(link.hasAttribute("target")).toBe(false);
    expect(link.hasAttribute("rel")).toBe(false);
    await userEvent.click(link);
    expect(screen.getByTestId("where").textContent).toBe("/services");
  });

  it("renders an https: link as a new-tab <a> with rel=noopener noreferrer", () => {
    mount("Read [the guide](https://example.com/guide).");
    const link = screen.getByRole("link", { name: "the guide" });
    expect(link.getAttribute("href")).toBe("https://example.com/guide");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("applies the same policy inside list items and table cells", () => {
    render(
      <MemoryRouter>
        <Block block={{ kind: "ul", items: ["[x](javascript:void0)", "[y](/contact)"] }} />
        <Block block={{ kind: "table", header: ["h"], rows: [["[z](//evil.example)"]] }} />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/contact"]);
    expect(screen.getByText("x").closest("a")).toBeNull();
    expect(screen.getByText("z").closest("a")).toBeNull();
  });
});
