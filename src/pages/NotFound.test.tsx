import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NotFound from "./NotFound";

// STS-057: internal navigation goes through the router. A plain <a href="/"> reloads the whole app;
// in a MemoryRouter it does not navigate at all, so this test fails if the link stops being a Link.
describe("404 page", () => {
  it("returns home through the router, without a page reload", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={["/no-such-page"]}>
        <Routes>
          <Route path="/" element={<p>home page</p>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>,
    );
    const home = screen.getByRole("link", { name: "Return to Home" });
    expect(home).toHaveAttribute("href", "/");
    await userEvent.setup().click(home);
    expect(screen.getByText("home page")).toBeInTheDocument();
  });
});
