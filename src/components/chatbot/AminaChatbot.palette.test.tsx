import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AminaChatbot from "./AminaChatbot";
import chatbotService from "@/services/chatbot.service";
import { composite, contrastRatio, hslToRgb, parseHsl, readTokens } from "@/design/contrast";

// The chat palette (B8 / FD-31, documented in docs/design/design-system.md section 7). Changed on
// purpose with B8: it was a gold user bubble with gray-900 text and a gray-900 Amina bubble. Now the
// user bubble is --primary (navy) with --primary-foreground, Amina's is --muted with --foreground,
// the header is --primary, and gold is kept for the launcher alone. Tokens only.
const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
const tokens = readTokens(css, ":root");
const rgb = (name: string) => hslToRgb(...parseHsl(tokens[name]));
const PRIMARY = rgb("primary");
const PRIMARY_FG = rgb("primary-foreground");
const MUTED = rgb("muted");
const FOREGROUND = rgb("foreground");
const MUTED_FG = rgb("muted-foreground");
const BACKGROUND = rgb("background");
const GOLD = rgb("gold");
const GOLD_FG = rgb("gold-foreground");
const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

beforeAll(async () => {
  await import("./ChatPanel");
}, 60000);

describe("chat bubble palette (B8 / FD-31)", () => {
  it("renders the user bubble navy with white text and Amina's bubble --muted with --foreground text", async () => {
    const user = userEvent.setup();
    vi.spyOn(chatbotService, "getResponse").mockResolvedValue("Bot reply");
    render(
      <MemoryRouter>
        <AminaChatbot />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.type(await screen.findByRole("textbox", { name: /message amina/i }, { timeout: 5000 }), "User question");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const mine = (await screen.findByText("User question")).closest("[data-chat-bubble]");
    expect(mine).toHaveAttribute("data-chat-bubble", "user");
    expect(classes(mine)).toEqual(expect.arrayContaining(["bg-primary", "text-primary-foreground"]));
    const amina = (await screen.findByText("Bot reply")).closest("[data-chat-bubble]");
    expect(amina).toHaveAttribute("data-chat-bubble", "amina");
    expect(classes(amina)).toEqual(expect.arrayContaining(["bg-muted", "text-foreground"]));
    for (const bubble of [mine, amina]) {
      expect(classes(bubble).filter((c) => /^(bg-gradient|from-|to-|bg-gold|bg-gray|text-gray|text-white)/.test(c))).toEqual([]);
    }
    expect(classes(mine?.querySelector("time") ?? null)).toContain("text-primary-foreground/80");
    expect(classes(amina?.querySelector("time") ?? null)).toContain("text-muted-foreground");
    expect(classes(document.querySelector("[data-chat-header]"))).toEqual(expect.arrayContaining(["bg-primary", "text-primary-foreground"]));
  });

  it("uses no hex colour, gray-* or gold class anywhere in the panel source", () => {
    const panel = readFileSync(resolve(__dirname, "ChatPanel.tsx"), "utf8");
    expect(panel).not.toMatch(/#[0-9a-f]{3,8}\b|\bgray-\d|\bgold\b|text-white|bg-white/i);
  });

  it.each([
    ["white text on the navy user bubble", PRIMARY_FG, PRIMARY, 4.5],
    ["white timestamp at 80% on navy", composite(PRIMARY_FG, PRIMARY, 0.8), PRIMARY, 4.5],
    ["--foreground text on the --muted Amina bubble", FOREGROUND, MUTED, 4.5],
    ["--muted-foreground timestamp on --muted", MUTED_FG, MUTED, 4.5],
    ["--primary link text on --muted", PRIMARY, MUTED, 4.5],
    ["white title on the navy header", PRIMARY_FG, PRIMARY, 4.5],
    ["--muted-foreground privacy notice on --background", MUTED_FG, BACKGROUND, 4.5],
    ["--muted-foreground typing dots on --muted (non-text, 1.4.11)", MUTED_FG, MUTED, 3],
    ["navy launcher icon on --gold (non-text)", GOLD_FG, GOLD, 3],
  ])("%s meets its WCAG minimum", (_name, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
