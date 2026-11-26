import { describe, it, expect, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Link, Route, Routes } from "react-router-dom";
import { act } from "react";
import Seo from "./Seo";
import { getSeo } from "@/seo/seo";

const tag = (sel: string) => document.head.querySelectorAll(sel);

describe("<Seo /> (STS-021)", () => {
  beforeEach(() => {
    cleanup();
    document.head.innerHTML = "<title>generic</title>";
    document.title = "generic";
  });

  it("sets the head for the current route, then updates on navigation without duplicates", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/about"]}>
        <Seo />
        <Link to="/contact">go</Link>
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
    expect(document.title).toBe(getSeo("/about").title);
    expect(tag('link[rel="canonical"]')).toHaveLength(1);
    expect(tag('link[rel="canonical"]')[0].getAttribute("href")).toMatch(/\/about$/);

    act(() => getByText("go").click());
    expect(document.title).toBe(getSeo("/contact").title);
    expect(tag("title")).toHaveLength(1);
    expect(tag('meta[name="description"]')).toHaveLength(1);
    expect(tag('meta[name="description"]')[0].getAttribute("content")).toBe(getSeo("/contact").description);
    expect(tag('link[rel="canonical"]')).toHaveLength(1);
    expect(tag('link[rel="canonical"]')[0].getAttribute("href")).toMatch(/\/contact$/);
    expect(tag('meta[property="og:url"]')).toHaveLength(1);
  });

  it("replaces the JSON-LD on navigation: the home Organization never lingers on an inner page (STS-024)", () => {
    // The prerendered home page ships its JSON-LD; hydration and navigation replace it.
    document.head.insertAdjacentHTML("beforeend", '<script type="application/ld+json" data-seo-jsonld>{"stale":true}</script>');
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Seo />
        <Link to="/services/paid-ads">go</Link>
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
    const ld = () => [...tag('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? ""));
    expect(ld()).toHaveLength(1);
    expect(JSON.stringify(ld())).toContain('"Organization"');
    expect(JSON.stringify(ld())).not.toContain("stale");

    act(() => document.querySelector("a")!.click());
    expect(ld().map((d) => d["@type"])).toEqual(["Service", "BreadcrumbList"]);
    expect(ld().some((d) => Array.isArray(d["@graph"]))).toBe(false);
  });

  it("drops the canonical and adds noindex on an unknown route", () => {
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <Seo />
        <Link to="/nope">go</Link>
      </MemoryRouter>,
    );
    expect(tag('link[rel="canonical"]')).toHaveLength(1);
    act(() => document.querySelector("a")!.click());
    expect(tag('link[rel="canonical"]')).toHaveLength(0);
    expect(tag('meta[name="robots"]')).toHaveLength(1);
  });
});
