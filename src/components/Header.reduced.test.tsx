import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// FD-30 / FF-16 under prefers-reduced-motion: the menu scrim appears and disappears without a fade.
// framer-motion reads the media query once per module graph, so it is set before Header is imported.
describe("Header menu scrim under reduced motion (FD-30, FF-16)", () => {
  it("renders the scrim at full opacity at once and removes it without a fade", async () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    const { default: Header } = await import("./Header");
    const { MotionProvider } = await import("./motion");

    render(
      <MotionProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Header />
        </MemoryRouter>
      </MotionProvider>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Open menu" }));
    const scrim = document.querySelector<HTMLElement>("[data-menu-scrim]");
    expect(scrim).not.toBeNull();
    // No entrance: never painted at opacity 0 first.
    expect(scrim?.getAttribute("style") ?? "").not.toMatch(/opacity:\s*0(?![.\d])/);

    fireEvent.pointerDown(scrim as HTMLElement);
    // A zero-length exit: gone within a frame or two, not after the 120 ms fade.
    await waitFor(() => expect(document.querySelector("[data-menu-scrim]")).toBeNull(), { timeout: 90, interval: 5 });
    // The first dynamic import of framer-motion can exceed the 5 s default on a cold machine.
  }, 30_000);
});
