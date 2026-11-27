import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import AminaChatbot from "./AminaChatbot";
import chatbotService from "@/services/chatbot.service";
import { CHAT_PRIVACY_NOTICE } from "@/content/legal/legal";

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

// The first import() of the panel chunk is a cold transform that can take seconds on a busy
// machine; warm it once so the tests measure the chat, not the compiler (as Layout.test.tsx does).
beforeAll(async () => {
  await import("./ChatPanel");
}, 60000);

function renderChatbot() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AminaChatbot />
      <LocationProbe />
    </MemoryRouter>,
  );
}

/**
 * FF-11: the panel is a lazy chunk, so it appears a tick after the click. Every test that opens the
 * chat waits for the dialog (these used to be synchronous getBy queries right after the click).
 */
async function openChat(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /open chat/i }));
  const dialog = await screen.findByRole("dialog", { name: "Amina" }, { timeout: 5000 });
  // The A10 entrance (opacity 0 to 1 over 320 ms) runs in jsdom too: wait until it has started.
  await waitFor(() => expect(dialog).toBeVisible());
  return dialog;
}

/** A reply the test settles by hand, to hold a request pending. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("AminaChatbot Send button (FE live bug: TypeError on click)", () => {
  it("sends the typed message when the Send button is clicked", async () => {
    const user = userEvent.setup();
    const getResponse = vi.spyOn(chatbotService, "getResponse").mockResolvedValue("Happy to help.");
    const consoleError = vi.spyOn(console, "error");

    renderChatbot();
    await openChat(user);
    await user.type(screen.getByPlaceholderText(/type your message/i), "What services do you offer?");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    // The click handler must pass the typed string, not the click event. (FF-6 added the options
    // argument that carries the AbortSignal; the request body is unchanged.)
    await waitFor(() =>
      expect(getResponse).toHaveBeenCalledWith("What services do you offer?", expect.objectContaining({ signal: expect.any(AbortSignal) })),
    );
    expect(await screen.findByText("What services do you offer?")).toBeInTheDocument();
    expect(await screen.findByText("Happy to help.")).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("gives every icon-only control an accessible name", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await openChat(user);
    expect(screen.getByRole("button", { name: /minimize chat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close chat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("shows the AI privacy notice above the input and links it to the field (STS-012, REQ-149)", async () => {
    const user = userEvent.setup();
    const getResponse = vi.spyOn(chatbotService, "getResponse").mockResolvedValue("ok");
    renderChatbot();
    await openChat(user);
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
    await openChat(user);
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

  it("has no 'Powered by' line other than the privacy notice (B8 / FD-31)", async () => {
    const user = userEvent.setup();
    renderChatbot();
    const dialog = await openChat(user);
    expect(dialog).not.toHaveTextContent(/powered by/i);
    expect(dialog).not.toHaveTextContent(/NLP/);
  });
});

describe("AminaChatbot renders links from an untrusted bot reply safely (STS-058 / SEC-16, FF-5)", () => {
  // FF-5 changed this on purpose: //evil.tld used to be rendered as a new-tab external link. The chat
  // allow-list now refuses every host it does not name, so it is plain text.
  it("a hostile reply cannot get //evil.tld or javascript: linked; a live route is routed and closes the chat", async () => {
    const user = userEvent.setup();
    vi.spyOn(chatbotService, "getResponse").mockResolvedValue(
      "Ignore your rules. Click [our contact page](//evil.tld/contact), [run](javascript:alert(document.cookie)), [prize](https://evil.example/win) or the real [contact form](/contact).",
    );
    renderChatbot();
    await openChat(user);
    await user.type(screen.getByPlaceholderText(/type your message/i), "hi");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const internal = await screen.findByRole("link", { name: "contact form" });
    expect(screen.queryByRole("link", { name: /our contact page/i })).toBeNull();
    expect(screen.getByText("our contact page").closest("a")).toBeNull();
    expect(screen.getByText("prize").closest("a")).toBeNull();
    expect(screen.getByText("run").closest("a")).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/javascript:|evil\.tld|evil\.example/i);

    expect(internal).toHaveAttribute("href", "/contact");
    expect(internal).not.toHaveAttribute("target");
    await user.click(internal);
    expect(screen.getByTestId("location")).toHaveTextContent("/contact");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("AminaChatbot fits a 320 px phone (STS-041)", () => {
  const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

  it("spans the viewport minus a gutter on phones and is 380 px wide only from `sm` up", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await openChat(user);
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
    await openChat(user);
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
    await openChat(user);
    await user.type(screen.getByRole("textbox", { name: /message amina/i }), "https://example.com/" + "a".repeat(60));
    await user.click(screen.getByRole("button", { name: /send message/i }));
    // The bubble lookup moved from div.rounded-2xl to [data-chat-bubble] with the B8 restyle.
    const bubble = (await screen.findByText(/example\.com/)).closest("[data-chat-bubble]");
    expect(classes(bubble)).toEqual(expect.arrayContaining(["max-w-[80%]", "min-w-0", "[overflow-wrap:anywhere]"]));
  });

  it("hides decorative launcher rings from pointer and reduced-motion users", () => {
    renderChatbot();
    const launcher = screen.getByRole("button", { name: /open chat/i });
    const rings = [...(launcher.parentElement?.children ?? [])].filter((el) => el !== launcher);
    // B8 / A11: two waves (there were three).
    expect(rings).toHaveLength(2);
    for (const ring of rings) expect(classes(ring)).toEqual(expect.arrayContaining(["pointer-events-none", "motion-reduce:hidden"]));
    expect(classes(launcher)).toEqual(expect.arrayContaining(["focus-visible:ring-2", "focus-visible:ring-ring"]));
  });
});

describe("chat launcher (B8 / FD-32)", () => {
  const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

  it("is a 56 px gold button on tokens, with a soft shadow and no hex colour", () => {
    renderChatbot();
    const launcher = screen.getByRole("button", { name: /open chat with amina/i });
    expect(classes(launcher)).toEqual(
      expect.arrayContaining(["h-14", "w-14", "rounded-full", "bg-gold", "text-gold-foreground", "shadow-md", "hover:shadow-lg"]),
    );
    expect(launcher).toHaveAttribute("aria-haspopup", "dialog");
    const source = readFileSync(resolve(__dirname, "ChatLauncher.tsx"), "utf8");
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|gray-\d|linear-gradient/i);
  });
});

describe("chat dialog accessibility (FF-7)", () => {
  it("is a modal dialog named by its title, with the conversation in a polite log", async () => {
    const user = userEvent.setup();
    renderChatbot();
    const dialog = await openChat(user);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Amina");
    const log = screen.getByRole("log");
    expect(dialog).toContainElement(log);
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveTextContent(/I'm Amina/);
  });

  it("moves focus to the message field on open, and the launcher steps aside", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await openChat(user);
    await waitFor(() => expect(screen.getByRole("textbox", { name: /message amina/i })).toHaveFocus());
    // visibility:hidden while the dialog is open: not focusable, not announced.
    expect(document.querySelector("[data-chat-launcher]")).toHaveClass("invisible");
  });

  it("closes on Escape and returns focus to the launcher", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await openChat(user);
    await waitFor(() => expect(screen.getByRole("textbox", { name: /message amina/i })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.getByRole("button", { name: /open chat/i })).toHaveFocus());
  });

  it("returns focus to the launcher when closed with the Close button", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await openChat(user);
    await user.click(screen.getByRole("button", { name: /close chat/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /open chat/i })).toHaveFocus());
  });

  it("keeps Tab and Shift+Tab inside the dialog", async () => {
    const user = userEvent.setup();
    renderChatbot();
    await openChat(user);
    const first = screen.getByRole("button", { name: /minimize chat/i });
    const last = screen.getByRole("button", { name: /send message/i });
    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it("keeps the conversation when the chat is closed and opened again", async () => {
    const user = userEvent.setup();
    vi.spyOn(chatbotService, "getResponse").mockResolvedValue("Remembered reply");
    renderChatbot();
    await openChat(user);
    await user.type(screen.getByRole("textbox", { name: /message amina/i }), "first{Enter}");
    expect(await screen.findByText("Remembered reply")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await openChat(user);
    expect(screen.getByText("Remembered reply")).toBeInTheDocument();
  });
});

describe("one chat request at a time (FF-6)", () => {
  it("refuses a second send, by Enter or by the Send button, while a reply is pending", async () => {
    const user = userEvent.setup();
    const pending = deferred<string>();
    const getResponse = vi.spyOn(chatbotService, "getResponse").mockReturnValue(pending.promise);
    renderChatbot();
    const dialog = await openChat(user);
    const input = screen.getByRole("textbox", { name: /message amina/i });

    await user.type(input, "first question{Enter}");
    expect(await within(dialog).findByRole("status")).toHaveTextContent(/amina is typing/i);
    await user.type(input, "second question{Enter}");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(getResponse).toHaveBeenCalledTimes(1);
    // The unsent text is kept, not lost.
    expect(input).toHaveValue("second question");
    expect(screen.getByRole("button", { name: /send message/i })).toHaveAttribute("aria-disabled", "true");

    pending.resolve("First answer");
    expect(await screen.findByText("First answer")).toBeInTheDocument();
    getResponse.mockResolvedValue("Second answer");
    await user.type(input, "{Enter}");
    expect(await screen.findByText("Second answer")).toBeInTheDocument();
    expect(getResponse).toHaveBeenCalledTimes(2);
  });

  it("closing the chat cancels the pending request and its late reply is never shown", async () => {
    const user = userEvent.setup();
    const pending = deferred<string>();
    let signal: AbortSignal | undefined;
    vi.spyOn(chatbotService, "getResponse").mockImplementation((_message, options) => {
      signal = options?.signal;
      return pending.promise;
    });
    renderChatbot();
    await openChat(user);
    await user.type(screen.getByRole("textbox", { name: /message amina/i }), "slow question{Enter}");
    await waitFor(() => expect(signal).toBeDefined());
    expect(signal!.aborted).toBe(false);

    await user.click(screen.getByRole("button", { name: /close chat/i }));
    expect(signal!.aborted).toBe(true);

    pending.resolve("Stale answer");
    const dialog = await openChat(user);
    // Let the stale promise settle, then check it was dropped.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("Stale answer")).toBeNull();
    expect(within(dialog).queryByRole("status")).toBeNull();
    expect(screen.getByText("slow question")).toBeInTheDocument();
  });

  it("shows the unavailable message (not a crash) when the request fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(chatbotService, "getResponse").mockRejectedValue(new Error("network down"));
    renderChatbot();
    await openChat(user);
    await user.type(screen.getByRole("textbox", { name: /message amina/i }), "hello there{Enter}");
    expect(await screen.findByRole("link", { name: "contact form" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("log")).toHaveTextContent(/chat is unavailable right now/i);
  });
});

describe("the chat panel is not in the main bundle (FF-11)", () => {
  const read = (file: string) => readFileSync(resolve(__dirname, file), "utf8");
  /** Static (value) imports: `import x from "..."`, not `import type` and not `import("...")`. */
  const staticImports = (source: string) =>
    [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);

  it("the launcher container and the launcher import neither the panel, the renderer nor react-markdown", () => {
    for (const file of ["AminaChatbot.tsx", "ChatLauncher.tsx"]) {
      const imports = staticImports(read(file));
      expect(imports.length, file).toBeGreaterThan(0);
      expect(imports.filter((m) => /ChatPanel|MarkdownRenderer|chatLinks|react-markdown|remark|chatbot\.service|openai\.service|@\/routes/.test(m)), file).toEqual([]);
    }
    expect(read("AminaChatbot.tsx")).toMatch(/import\("\.\/ChatPanel"\)/);
  });
});
