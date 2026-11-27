import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// FF-11: the panel is a separate chunk, so it can fail to download (offline, a deploy in progress).
// The visitor then gets a short message and the contact form, never a blank screen or a crash.
vi.mock("./ChatPanel", () => {
  throw new Error("Failed to fetch dynamically imported module");
});

import AminaChatbot from "./AminaChatbot";

describe("chat panel chunk fails to load (FF-11)", () => {
  it("says chat could not load, offers the contact form and returns focus to the launcher on close", { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <AminaChatbot />
      </MemoryRouter>,
    );
    // A plain click, no hover: vitest's module mocker does not settle a second import() of a module
    // whose factory failed, which the hover prefetch followed by the click's own import would need.
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const alert = await screen.findByRole("alertdialog", { name: /chat could not load/i }, { timeout: 8000 });
    expect(screen.getByRole("link", { name: "contact form" })).toHaveAttribute("href", "/contact");
    expect(alert).not.toHaveTextContent(/failed to fetch|module/i);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: /open chat/i })).toHaveFocus());
  });
});
