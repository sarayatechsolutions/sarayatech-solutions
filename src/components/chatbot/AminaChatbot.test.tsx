import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AminaChatbot from "./AminaChatbot";
import chatbotService from "@/services/chatbot.service";

function renderChatbot() {
  return render(
    <MemoryRouter>
      <AminaChatbot />
    </MemoryRouter>,
  );
}

describe("AminaChatbot Send button (FE live bug: TypeError on click)", () => {
  it("sends the typed message when the Send button is clicked", async () => {
    const user = userEvent.setup();
    const getResponse = vi.spyOn(chatbotService, "getResponse").mockResolvedValue("Happy to help.");
    const consoleError = vi.spyOn(console, "error");

    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.type(screen.getByPlaceholderText(/type your message/i), "What services do you offer?");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    // The click handler must pass the typed string, not the click event.
    await waitFor(() => expect(getResponse).toHaveBeenCalledWith("What services do you offer?"));
    expect(await screen.findByText("What services do you offer?")).toBeInTheDocument();
    expect(await screen.findByText("Happy to help.")).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("gives every icon-only control an accessible name", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    expect(screen.getByRole("button", { name: /minimize chat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close chat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });
});
