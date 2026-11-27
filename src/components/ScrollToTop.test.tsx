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
    <Link to="/b#target">to target</Link>
    <section id="target">target</section>
    <section id="with space">spaced</section>
  </div>
);

const renderApp = (initial = "/a") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <ScrollToTop />
      <Nav />
      <Routes>
        <Route path="/a" element={<Page name="A" />} />
        <Route path="/b" element={<Page name="B" />} />
      </Routes>
    </MemoryRouter>,
  );

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

  it("hashTarget decodes the id and treats an empty hash as no target", () => {
    renderApp();
    expect(hashTarget("")).toBeNull();
    expect(hashTarget("#")).toBeNull();
    expect(hashTarget("#target")).toBe(document.getElementById("target"));
    expect(hashTarget("#with%20space")).toBe(document.getElementById("with space"));
    expect(hashTarget("#%E0%A4%A")).toBeNull();
  });
});
