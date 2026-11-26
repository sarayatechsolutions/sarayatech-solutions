import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import colors from "tailwindcss/colors";
import AminaChatbot from "./AminaChatbot";
import chatbotService from "@/services/chatbot.service";
import { composite, contrastRatio, hslToRgb, parseHsl, readTokens, type Rgb } from "@/design/contrast";

// The chat palette (STS-041, documented in docs/design/design-system.md by STS-063): the user bubble
// is solid --gold with gray-900 text (it was a gold-to-red gradient with an undefined `text-dark`),
// Amina's bubble is gray-900 with white text. These hold the classes and the contrast together.
const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
const GOLD = hslToRgb(...parseHsl(readTokens(css, ":root").gold));
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const GRAY_900 = hex(colors.gray[900]);
const WHITE: Rgb = [255, 255, 255];
const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("chat bubble palette (STS-041 / STS-063)", () => {
  it("renders the user bubble gold with gray-900 text and Amina's bubble gray-900 with white text", async () => {
    const user = userEvent.setup();
    vi.spyOn(chatbotService, "getResponse").mockResolvedValue("Bot reply");
    render(
      <MemoryRouter>
        <AminaChatbot />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.type(screen.getByRole("textbox", { name: /message amina/i }), "User question");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const mine = (await screen.findByText("User question")).closest("div.rounded-2xl");
    expect(classes(mine)).toEqual(expect.arrayContaining(["bg-gold", "text-gray-900"]));
    expect(classes(mine).filter((c) => /^(bg-gradient|from-|to-)/.test(c))).toEqual([]);
    const amina = (await screen.findByText("Bot reply")).closest("div.rounded-2xl");
    expect(classes(amina)).toEqual(expect.arrayContaining(["bg-gray-900", "text-white"]));
    // The timestamp is the faintest text in a bubble.
    for (const bubble of [mine, amina]) expect(classes(bubble?.querySelector("span") ?? null)).toContain("opacity-80");
  });

  it.each([
    ["gray-900 text on the gold user bubble", GRAY_900, GOLD, 4.5],
    ["gray-900 timestamp at 80% on gold", composite(GRAY_900, GOLD, 0.8), GOLD, 4.5],
    ["white text on the gray-900 Amina bubble", WHITE, GRAY_900, 4.5],
    ["white timestamp at 80% on gray-900", composite(WHITE, GRAY_900, 0.8), GRAY_900, 4.5],
    ["gold typing dots on gray-900 (non-text, 1.4.11)", GOLD, GRAY_900, 3],
    ["gray-900 launcher icon on its lightest gradient stop #D4AF37 (non-text)", GRAY_900, hex("#D4AF37"), 3],
  ])("%s meets its WCAG minimum", (_name, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
