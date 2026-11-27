import { describe, it, expect } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import RouteAnnouncer, { ROUTE_ANNOUNCER_ATTR } from "./RouteAnnouncer";
import { MAIN_CONTENT_ID } from "@/components/Header";
import { getSeo } from "@/seo/seo";

// FF-9 (design audit B7): after a client-side route change the new title is announced politely and
// focus moves to the page's h1 (or <main>), so a keyboard or screen-reader user starts on the page.

let navigate: ReturnType<typeof useNavigate>;
const Nav = () => {
  navigate = useNavigate();
  return null;
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <>
    <nav>
      <Link to="/about">About</Link>
      <Link to="/pricing">Pricing</Link>
      <Link to="/about#team">Team</Link>
    </nav>
    <main id={MAIN_CONTENT_ID} tabIndex={-1}>
      {children}
    </main>
  </>
);

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <RouteAnnouncer />
      <Nav />
      <Routes>
        <Route path="/" element={<Shell><h1>Home</h1></Shell>} />
        <Route path="/about" element={<Shell><h1>About us</h1><p id="team">team</p></Shell>} />
        {/* A page without an h1: focus falls back to <main>. */}
        <Route path="/pricing" element={<Shell><p>no heading here</p></Shell>} />
      </Routes>
    </MemoryRouter>,
  );

const region = () => document.querySelector(`[${ROUTE_ANNOUNCER_ATTR}]`) as HTMLElement;

describe("RouteAnnouncer (FF-9)", () => {
  it("is a polite, atomic, visually hidden live region, and not a second role=status", () => {
    renderApp();
    expect(region()).toHaveAttribute("aria-live", "polite");
    expect(region()).toHaveAttribute("aria-atomic", "true");
    expect(region()).toHaveClass("sr-only");
    expect(region()).not.toHaveAttribute("role");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("says nothing and moves no focus on the first render", () => {
    renderApp();
    expect(region()).toHaveTextContent("");
    expect(document.activeElement).toBe(document.body);
  });

  it("on a link click, focuses the new h1 without adding it to the tab order, and announces the title", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "About" }));
    const h1 = screen.getByRole("heading", { level: 1, name: "About us" });
    expect(h1).toHaveFocus();
    expect(h1).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(region()).toHaveTextContent(getSeo("/about").title));
  });

  it("falls back to <main> on a page without an h1", async () => {
    renderApp();
    await userEvent.setup().click(screen.getByRole("link", { name: "Pricing" }));
    expect(document.getElementById(MAIN_CONTENT_ID)).toHaveFocus();
    await waitFor(() => expect(region()).toHaveTextContent(getSeo("/pricing").title));
  });

  it("on Back, announces the page but leaves focus to the browser", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "About" }));
    const about = screen.getByRole("link", { name: "About" });
    about.focus();
    act(() => navigate(-1));
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).not.toHaveFocus();
    await waitFor(() => expect(region()).toHaveTextContent(getSeo("/").title));
  });

  it("does nothing when only the hash changes on the same page", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "About" }));
    await waitFor(() => expect(region()).toHaveTextContent(getSeo("/about").title));
    const team = screen.getByRole("link", { name: "Team" });
    team.focus();
    await user.click(team);
    expect(team).toHaveFocus();
    expect(region()).toHaveTextContent(getSeo("/about").title);
  });
});
