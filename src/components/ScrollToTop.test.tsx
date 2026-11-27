import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import ScrollToTop, { SCROLL_STORAGE_KEY, hashTarget } from "./ScrollToTop";

// FF-8 (design audit B7): a new route starts at the top, Back/Forward restore the position, a hash
// link scrolls to its target (the header offset is CSS scroll-padding), and nothing is smooth.

let navigate: ReturnType<typeof useNavigate>;
const Nav = () => {
  navigate = useNavigate();
  return null;
};

const Page = ({ name }: { name: string }) => (
  <div>
    <h1>{name}</h1>
    <Link to="/b">to b</Link>
    <Link to="/a">to a</Link>
    <Link to="/b#target">to target</Link>
    <section id="target">target</section>
    <section id="with space">spaced</section>
  </div>
);

const renderApp = (initial: string | string[] = "/a") => {
  const entries = Array.isArray(initial) ? initial : [initial];
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <ScrollToTop />
      <Nav />
      <Routes>
        <Route path="/a" element={<Page name="A" />} />
        <Route path="/b" element={<Page name="B" />} />
        <Route path="/contact" element={<Page name="Contact" />} />
      </Routes>
    </MemoryRouter>,
  );
};

const storedRaw = () => window.sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "";

const scrollTo = () => window.scrollTo as unknown as ReturnType<typeof vi.fn>;

/** Puts the window at `y` and lets the rAF-throttled listener record it. */
async function scrollWindowTo(y: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: y });
  window.dispatchEvent(new Event("scroll"));
  await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
}

beforeEach(() => {
  scrollTo().mockClear();
  (Element.prototype.scrollIntoView as unknown as ReturnType<typeof vi.fn>).mockClear?.();
  window.sessionStorage.clear();
});
afterEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
});

describe("ScrollToTop (FF-8)", () => {
  it("takes scroll restoration over from the browser, and hands it back on unmount", () => {
    // jsdom has no history.scrollRestoration; give it one, as every supported browser has.
    Object.defineProperty(window.history, "scrollRestoration", {
      configurable: true,
      writable: true,
      value: "auto",
    });
    const { unmount } = renderApp();
    expect(window.history.scrollRestoration).toBe("manual");
    unmount();
    expect(window.history.scrollRestoration).toBe("auto");
    delete (window.history as unknown as Record<string, unknown>).scrollRestoration;
  });

  it("does not move the page on the first render", () => {
    renderApp();
    expect(scrollTo()).not.toHaveBeenCalled();
  });

  it("starts a new route at the top, instantly", async () => {
    renderApp();
    await scrollWindowTo(900);
    await userEvent.setup().click(screen.getByRole("link", { name: "to b" }));
    expect(screen.getByRole("heading", { name: "B" })).toBeInTheDocument();
    expect(scrollTo()).toHaveBeenLastCalledWith(0, 0);
    for (const call of scrollTo().mock.calls) expect(JSON.stringify(call)).not.toContain("smooth");
  });

  it("restores the position on Back, and again on Forward", async () => {
    renderApp();
    await scrollWindowTo(640);
    await userEvent.setup().click(screen.getByRole("link", { name: "to b" }));
    await scrollWindowTo(120);
    scrollTo().mockClear();

    act(() => navigate(-1));
    expect(screen.getByRole("heading", { name: "A" })).toBeInTheDocument();
    expect(scrollTo()).toHaveBeenLastCalledWith(0, 640);

    act(() => navigate(1));
    expect(screen.getByRole("heading", { name: "B" })).toBeInTheDocument();
    expect(scrollTo()).toHaveBeenLastCalledWith(0, 120);
  });

  it("scrolls a hash link's target into view instead of jumping to the top", async () => {
    const intoView = vi.fn();
    const spy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(intoView);
    renderApp();
    await userEvent.setup().click(screen.getByRole("link", { name: "to target" }));
    expect(intoView).toHaveBeenCalledTimes(1);
    expect(intoView.mock.contexts[0]).toBe(document.getElementById("target"));
    expect(intoView).toHaveBeenCalledWith({ block: "start" });
    expect(scrollTo()).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("an unknown hash on a new route falls back to the top", async () => {
    renderApp();
    act(() => navigate("/b#nothing-here"));
    expect(scrollTo()).toHaveBeenLastCalledWith(0, 0);
  });

  it("keeps the position when a REPLACE only changes the query of the same page", async () => {
    renderApp();
    await scrollWindowTo(300);
    act(() => navigate("/a?tab=2", { replace: true }));
    expect(scrollTo()).not.toHaveBeenCalled();
  });

  it("a link to the page already shown goes to the top (FF-17: React Router makes it a REPLACE)", async () => {
    renderApp();
    await scrollWindowTo(600);
    await userEvent.setup().click(screen.getByRole("link", { name: "to a" }));
    expect(screen.getByRole("heading", { name: "A" })).toBeInTheDocument();
    expect(scrollTo()).toHaveBeenCalledTimes(1);
    expect(scrollTo()).toHaveBeenLastCalledWith(0, 0);
  });

  it("an identical-URL REPLACE with a query goes to the top; a query change still keeps the position", async () => {
    renderApp("/a?tab=2");
    await scrollWindowTo(400);
    act(() => navigate("/a?tab=3", { replace: true }));
    expect(scrollTo()).not.toHaveBeenCalled();
    act(() => navigate("/a?tab=3", { replace: true }));
    expect(scrollTo()).toHaveBeenLastCalledWith(0, 0);
  });

  it("keeps positions across a reload in sessionStorage (written on pagehide)", async () => {
    renderApp();
    await scrollWindowTo(450);
    window.dispatchEvent(new Event("pagehide"));
    const stored = JSON.parse(window.sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "[]") as [string, number][];
    expect(stored.some(([key, y]) => key.endsWith("|/a") && y === 450)).toBe(true);
  });

  it("ignores a corrupt stored value instead of throwing", () => {
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, "{not json");
    expect(() => renderApp()).not.toThrow();
  });

  it("ignores malformed entries of every shape instead of throwing", () => {
    for (const value of ['{"a":1}', "null", "42", '[null,1,"x",[1,2],["k"],["default|/a","9"],["default|/a",null]]']) {
      window.sessionStorage.setItem(SCROLL_STORAGE_KEY, value);
      const { unmount } = renderApp();
      unmount();
    }
    expect(scrollTo()).not.toHaveBeenCalled();
  });

  // Security review (Low): a query string or hash can carry personal data from an inbound link, so
  // neither is ever written to sessionStorage. The key is `<history key>|<pathname>`.
  it("never stores the query string or the hash of a visited URL", async () => {
    renderApp();
    act(() => navigate("/contact?email=a@b.c#x"));
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
    await scrollWindowTo(200);
    window.dispatchEvent(new Event("pagehide"));

    const raw = storedRaw();
    for (const leaked of ["email", "a@b.c", "?", "#"]) expect(raw).not.toContain(leaked);
    const stored = JSON.parse(raw) as [string, number][];
    expect(stored.some(([key, y]) => key.endsWith("|/contact") && y === 200)).toBe(true);
  });

  it("never stores the query string of the URL the tab was opened on", async () => {
    renderApp("/contact?email=a@b.c#x");
    await scrollWindowTo(80);
    window.dispatchEvent(new Event("pagehide"));
    const raw = storedRaw();
    for (const leaked of ["email", "a@b.c", "?", "#"]) expect(raw).not.toContain(leaked);
    expect(JSON.parse(raw)).toEqual([["default|/contact", 80]]);
  });

  it("drops entries stored by an older build (full URL in the key) as soon as it loads", () => {
    window.sessionStorage.setItem(
      SCROLL_STORAGE_KEY,
      JSON.stringify([
        ["k1|/contact?email=a@b.c#x", 300],
        ["k2|/b#target", 40],
        ["k3|/b", 120],
      ]),
    );
    renderApp();
    const raw = storedRaw();
    expect(raw).not.toContain("email");
    expect(JSON.parse(raw)).toEqual([["k3|/b", 120]]);
  });

  it("still restores the position on Back to a URL with a query", async () => {
    renderApp();
    act(() => navigate("/b?tab=2"));
    await scrollWindowTo(330);
    act(() => navigate("/a"));
    scrollTo().mockClear();
    act(() => navigate(-1));
    expect(screen.getByRole("heading", { name: "B" })).toBeInTheDocument();
    expect(scrollTo()).toHaveBeenLastCalledWith(0, 330);
  });

  it("a plain #anchor link (the skip link) goes to its target, not to the page's saved position", () => {
    // The browser reports a plain anchor link as a POP with no router state ("default" key) on the
    // same page, so it shares the page's stored key. Simulated: entry 0 is that anchor entry.
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify([["default|/a", 500]]));
    const intoView = vi.fn();
    const spy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(intoView);
    renderApp(["/a#target", "/a"]);
    act(() => navigate(-1));
    expect(intoView).toHaveBeenCalledTimes(1);
    expect(intoView.mock.contexts[0]).toBe(document.getElementById("target"));
    expect(scrollTo()).not.toHaveBeenCalledWith(0, 500);
    spy.mockRestore();
  });

  it("hashTarget decodes the id and treats an empty hash as no target", () => {
    renderApp();
    expect(hashTarget("")).toBeNull();
    expect(hashTarget("#")).toBeNull();
    expect(hashTarget("#target")).toBe(document.getElementById("target"));
    expect(hashTarget("#with%20space")).toBe(document.getElementById("with space"));
    expect(hashTarget("#%E0%A4%A")).toBeNull();
  });
});
