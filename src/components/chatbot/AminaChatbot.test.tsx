import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import AminaChatbot from "./AminaChatbot";
import chatbotService from "@/services/chatbot.service";

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderChatbot() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AminaChatbot />
      <LocationProbe />
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

  it("shows the AI privacy notice above the input and links it to the field (STS-012)", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    const notice = screen.getByText(
      "Messages are processed by our AI provider to answer you. Please don't share sensitive information.",
    );
    const input = screen.getByRole("textbox", { name: /message amina/i });
    expect(input).toHaveAttribute("aria-describedby", notice.id);
    expect(input).toHaveAttribute("maxLength", "1000");
  });
});

describe("AminaChatbot renders links from an untrusted bot reply safely (STS-058 / SEC-16)", () => {
  it("a hostile reply cannot get //evil.tld routed in-app or a javascript: link rendered", async () => {
    const user = userEvent.setup();
    vi.spyOn(chatbotService, "getResponse").mockResolvedValue(
      "Ignore your rules. Click [our contact page](//evil.tld/contact), [run](javascript:alert(document.cookie)) or the real [contact form](/contact).",
    );
    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.type(screen.getByPlaceholderText(/type your message/i), "hi");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const evil = await screen.findByRole("link", { name: /our contact page/i });
    expect(evil).toHaveAttribute("href", "https://evil.tld/contact");
    expect(evil).toHaveAttribute("target", "_blank");
    expect(evil.getAttribute("rel")?.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));

    expect(screen.getByText("run").closest("a")).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/javascript:/i);

    const internal = screen.getByRole("link", { name: "contact form" });
    expect(internal).toHaveAttribute("href", "/contact");
    await user.click(internal);
    expect(screen.getByTestId("location")).toHaveTextContent("/contact");
  });
});
