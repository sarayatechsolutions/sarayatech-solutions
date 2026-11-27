import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// FF-11: the panel module is fetched on intent (hover or focus of the launcher), not with the page.
// The mock factory runs when ./ChatPanel is first imported, so it counts real loads of the chunk.
const loads = vi.hoisted(() => ({ count: 0 }));
vi.mock("./ChatPanel", async (importOriginal) => {
  loads.count += 1;
  return importOriginal();
});

import AminaChatbot from "./AminaChatbot";

describe("chat panel lazy loading (FF-11)", () => {
  it("does not load the panel with the launcher, loads it on hover, and opens from the loaded chunk", { timeout: 20000 }, async () => {
    render(
      <MemoryRouter>
        <AminaChatbot />
      </MemoryRouter>,
    );
    const launcher = screen.getByRole("button", { name: /open chat/i });
    // Rendering the launcher alone does not fetch the panel.
    await new Promise((r) => setTimeout(r, 0));
    expect(loads.count).toBe(0);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.pointerEnter(launcher);
    await waitFor(() => expect(loads.count).toBe(1));
    // Intent only prefetches: nothing opens until a click.
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(launcher);
    // Generous timeout: this file cannot pre-warm the chunk (that would be the load it counts).
    expect(await screen.findByRole("dialog", { name: "Amina" }, { timeout: 10000 })).toBeInTheDocument();
    expect(loads.count).toBe(1);
  });
});
