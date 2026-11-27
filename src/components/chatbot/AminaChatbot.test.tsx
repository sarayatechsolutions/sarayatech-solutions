import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import AminaChatbot from "./AminaChatbot";
import chatbotService from "@/services/chatbot.service";
import { CHAT_PRIVACY_NOTICE } from "@/content/legal/legal";

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

  it("shows the AI privacy notice above the input and links it to the field (STS-012, REQ-149)", async () => {
    const user = userEvent.setup();
    const getResponse = vi.spyOn(chatbotService, "getResponse").mockResolvedValue("ok");
    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    // Visible before the first message: nothing has been sent yet.
    expect(getResponse).not.toHaveBeenCalled();
    const notice = document.getElementById("amina-privacy-notice") as HTMLElement;
    expect(notice).toBeVisible();
    expect(notice).toHaveTextContent(CHAT_PRIVACY_NOTICE.text);
    // It names the same processor the Privacy Policy names.
    expect(notice).toHaveTextContent(/OpenAI/);
    const input = screen.getByRole("textbox", { name: /message amina/i });
    expect(input).toHaveAttribute("aria-describedby", notice.id);
    expect(input).toHaveAttribute("maxLength", "1000");
    // It sits above the input, so it is read before typing.
    expect(notice.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("links the notice to /privacy in a new tab, so the open conversation is not lost (REQ-149)", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    const link = screen.getByRole("link", { name: /privacy policy/i });
    expect(document.getElementById("amina-privacy-notice")).toContainElement(link);
    expect(link).toHaveAttribute("href", "/privacy");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")?.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    expect(link).toHaveAccessibleName(/opens in a new tab/i);
    await user.click(link);
    // No in-app navigation: the chat stays where it was.
    expect(screen.getByTestId("location")).toHaveTextContent("/");
    expect(screen.getByRole("textbox", { name: /message amina/i })).toBeInTheDocument();
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

describe("AminaChatbot fits a 320 px phone (STS-041)", () => {
  const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

  it("spans the viewport minus a gutter on phones and is 380 px wide only from `sm` up", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    const panel = document.querySelector("[data-chat-panel]");
    const c = classes(panel);
    // Below `sm`: pinned 8 px from both edges, so its width is 100vw - 16 px (304 px at 320 px).
    expect(c).toEqual(expect.arrayContaining(["fixed", "inset-x-2", "bottom-2"]));
    // A fixed 380 px width only applies from `sm` (640 px), where it fits.
    expect(c).toEqual(expect.arrayContaining(["sm:inset-x-auto", "sm:right-6", "sm:w-[380px]"]));
    expect(c.filter((k) => /^w-\[/.test(k) || /^w-\d/.test(k))).toEqual([]);
    // Never taller than the viewport: the header (close button) and the input stay on screen.
    expect(c).toEqual(expect.arrayContaining(["max-h-[calc(100dvh-1rem)]", "sm:max-h-[calc(100dvh-3rem)]", "flex-col"]));
  });

  it("keeps the close button and the input reachable when the panel is squeezed", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    // Header and input area do not shrink; the message list (flex-1 min-h-0) gives up the height.
    expect(classes(document.querySelector("[data-chat-header]"))).toContain("shrink-0");
    expect(classes(document.querySelector("[data-chat-input-area]"))).toContain("shrink-0");
    const list = document.querySelector("[data-chat-panel] [data-radix-scroll-area-viewport]")?.parentElement;
    expect(classes(list ?? null)).toEqual(expect.arrayContaining(["flex-1", "min-h-0"]));
    // The header text can wrap instead of pushing the controls out of the 304 px panel.
    const close = screen.getByRole("button", { name: /close chat/i });
    expect(classes(close.parentElement)).toContain("shrink-0");
    // 44 px touch targets for the header controls and Send.
    for (const name of [/close chat/i, /minimize chat/i, /send message/i]) {
      expect(classes(screen.getByRole("button", { name }))).toEqual(expect.arrayContaining(["h-11", "w-11"]));
    }
    expect(classes(screen.getByRole("textbox", { name: /message amina/i }))).toEqual(
      expect.arrayContaining(["min-w-0", "flex-1"]),
    );
  });

  it("lets a long unbroken word (a URL) wrap inside a bubble instead of widening the panel", async () => {
    const user = userEvent.setup();
    vi.spyOn(chatbotService, "getResponse").mockResolvedValue("ok");
    renderChatbot();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.type(screen.getByRole("textbox", { name: /message amina/i }), "https://example.com/" + "a".repeat(60));
    await user.click(screen.getByRole("button", { name: /send message/i }));
    const bubble = (await screen.findByText(/example\.com/)).closest("div.rounded-2xl");
    expect(classes(bubble)).toEqual(expect.arrayContaining(["max-w-[80%]", "min-w-0", "[overflow-wrap:anywhere]"]));
  });

  it("hides decorative launcher rings from pointer and reduced-motion users", () => {
    renderChatbot();
    const launcher = screen.getByRole("button", { name: /open chat/i });
    const rings = [...(launcher.parentElement?.children ?? [])].filter((el) => el !== launcher);
    expect(rings).toHaveLength(3);
    for (const ring of rings) expect(classes(ring)).toEqual(expect.arrayContaining(["pointer-events-none", "motion-reduce:hidden"]));
    expect(classes(launcher)).toEqual(expect.arrayContaining(["focus-visible:ring-2", "focus-visible:ring-ring"]));
  });
});
