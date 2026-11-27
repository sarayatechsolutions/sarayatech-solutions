import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { composite, contrastRatio, gradientStops, hslToRgb, parseHsl, readTokens, type Rgb } from "./contrast";

// STS-041. The token sheet is read from src/index.css itself, so a token edit that drops a pair the
// live pages use below WCAG 2.1 AA fails here, before anyone has to notice it on a phone outdoors.
const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const light = readTokens(css, ":root");
const dark = readTokens(css, ".dark");

const color = (tokens: Record<string, string>, name: string): Rgb => {
  if (!(name in tokens)) throw new Error(`--${name} is not defined`);
  return hslToRgb(...parseHsl(tokens[name]));
};
const t = (name: string) => color(light, name);
const WHITE: Rgb = [255, 255, 255];

/** 1.4.3 normal text, 1.4.3 large text / 1.4.11 control boundaries and focus indicators. */
const TEXT = 4.5;
const NON_TEXT = 3;

describe("helpers", () => {
  it("match the WCAG reference values", () => {
    expect(contrastRatio([0, 0, 0], WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
    // #767676 is the classic lightest grey that passes 4.5:1 on white.
    expect(contrastRatio([118, 118, 118], WHITE)).toBeCloseTo(4.54, 2);
    expect(hslToRgb(0, 100, 50).map(Math.round)).toEqual([255, 0, 0]);
  });
});

describe("design tokens meet WCAG 2.1 AA (STS-041)", () => {
  // [description, foreground, background, minimum]
  const pairs: [string, Rgb, Rgb, number][] = [
    // The red call to action at rest, on hover and pressed (design audit B1: hover and pressed are
    // darker steps, #BD0F0F 6.50:1 and #A50D0D 7.87:1; the lighter --accent-light is gone).
    ["CTA label on --accent", t("accent-foreground"), t("accent"), TEXT],
    ["CTA label on --accent-hover (hover)", t("accent-foreground"), t("accent-hover"), TEXT],
    ["CTA label on --accent-active (pressed)", t("accent-foreground"), t("accent-active"), TEXT],
    ["CTA red as text on the page (--accent on --background)", t("accent"), t("background"), TEXT],
    ["error text (--destructive on --background)", t("destructive"), t("background"), TEXT],
    ["--destructive-foreground on --destructive", t("destructive-foreground"), t("destructive"), TEXT],
    // Design audit B1: inline error and success states.
    ["error text (--destructive on --destructive-surface)", t("destructive"), t("destructive-surface"), TEXT],
    ["success text (--success on --background)", t("success"), t("background"), TEXT],
    ["success text (--success on --success-surface)", t("success"), t("success-surface"), TEXT],
    ["--success-foreground on --success", t("success-foreground"), t("success"), TEXT],
    // Design audit B1: alternate bands. Text that sits on --muted must also pass on the lighter
    // --surface-subtle that replaces bg-muted/30.
    ["--foreground on --surface-subtle", t("foreground"), t("surface-subtle"), TEXT],
    ["--secondary text on --surface-subtle", t("secondary"), t("surface-subtle"), TEXT],
    ["--muted-foreground on --surface-subtle", t("muted-foreground"), t("surface-subtle"), TEXT],
    ["--primary text on --surface-subtle", t("primary"), t("surface-subtle"), TEXT],
    // Body copy.
    ["--foreground on --background", t("foreground"), t("background"), TEXT],
    ["--card-foreground on --card", t("card-foreground"), t("card"), TEXT],
    ["--primary text on --background", t("primary"), t("background"), TEXT],
    ["--primary text on --muted", t("primary"), t("muted"), TEXT],
    ["--secondary text on --background", t("secondary"), t("background"), TEXT],
    // bg-muted/30 sections and the mobile menu hover are bg-muted at their darkest.
    ["--secondary text on --muted", t("secondary"), t("muted"), TEXT],
    ["--muted-foreground on --background", t("muted-foreground"), t("background"), TEXT],
    ["--muted-foreground on --muted", t("muted-foreground"), t("muted"), TEXT],
    ["--secondary-foreground on --secondary", t("secondary-foreground"), t("secondary"), TEXT],
    ["--gold-foreground on --gold", t("gold-foreground"), t("gold"), TEXT],
    // Navy bands (hero, final CTA, footer): white and translucent white on the lightest navy.
    ["--primary-foreground on --primary", t("primary-foreground"), t("primary"), TEXT],
    ["--primary-foreground on --primary-light", t("primary-foreground"), t("primary-light"), TEXT],
    ["--primary-foreground on --primary-dark", t("primary-foreground"), t("primary-dark"), TEXT],
    ["text-white/85 on --primary-light (hero gradient midpoint)", composite(WHITE, t("primary-light"), 0.85), t("primary-light"), TEXT],
    ["text-primary-foreground/70 on --primary (footer copyright)", composite(t("primary-foreground"), t("primary"), 0.7), t("primary"), TEXT],
    // Design audit B1 on-dark text: white/70 on navy is the lowest opacity allowed for text.
    ["text-white/80 on --primary", composite(WHITE, t("primary"), 0.8), t("primary"), TEXT],
    ["text-white/70 on --primary", composite(WHITE, t("primary"), 0.7), t("primary"), TEXT],
    ["text-white/90 on --primary-light", composite(WHITE, t("primary-light"), 0.9), t("primary-light"), TEXT],
    ["text-white/70 on --primary-dark (footer)", composite(WHITE, t("primary-dark"), 0.7), t("primary-dark"), TEXT],
    // --gold is the chat launcher only.
    ["--primary on --gold", t("primary"), t("gold"), TEXT],
    ["--foreground on --gold", t("foreground"), t("gold"), TEXT],
    // Non-text: form control boundaries and focus rings.
    ["--input boundary on --background", t("input"), t("background"), NON_TEXT],
    ["--input boundary on --muted", t("input"), t("muted"), NON_TEXT],
    ["--ring focus ring on --background", t("ring"), t("background"), NON_TEXT],
    ["footer focus ring (--primary-foreground on --primary)", t("primary-foreground"), t("primary"), NON_TEXT],
    ["white focus-ring offset band on --primary-light (navy bands)", WHITE, t("primary-light"), NON_TEXT],
    ["--input boundary on --surface-subtle", t("input"), t("surface-subtle"), NON_TEXT],
    // on-dark button outline (white/60 border on navy) and the white focus outline on navy.
    ["on-dark button border white/60 on --primary", composite(WHITE, t("primary"), 0.6), t("primary"), NON_TEXT],
    ["white focus outline on --primary-dark", WHITE, t("primary-dark"), NON_TEXT],
  ];

  it.each(pairs)("%s", (_name, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  // Design audit B1 removed the unused --gradient-accent and --gradient-gold.
  it.each([["gradient-primary"], ["gradient-hero"]])(
    "white text passes on every stop of --%s (darkest-to-lightest worst case)",
    (name) => {
      const stops = gradientStops(light[name]);
      expect(stops.length).toBeGreaterThanOrEqual(2);
      for (const stop of stops) expect(contrastRatio(WHITE, stop)).toBeGreaterThanOrEqual(TEXT);
    },
  );

  it("the dark theme keeps the CTA and error colours readable too", () => {
    expect(contrastRatio(color(dark, "accent-foreground"), color(dark, "accent"))).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(color(dark, "destructive-foreground"), color(dark, "destructive"))).toBeGreaterThanOrEqual(TEXT);
  });

  it("design audit B1: hover and pressed are darker than the CTA, never lighter", () => {
    const l = (name: string) => parseHsl(light[name])[2];
    expect(l("accent-hover")).toBeLessThan(l("accent"));
    expect(l("accent-active")).toBeLessThan(l("accent-hover"));
    // The audit rounds the pressed ratio to "7.9 or higher"; the exact HSL measures 7.87:1.
    expect(contrastRatio(WHITE, t("accent-active"))).toBeGreaterThan(contrastRatio(WHITE, t("accent-hover")));
    expect(contrastRatio(WHITE, t("accent-active"))).toBeGreaterThanOrEqual(7.8);
    for (const name of ["accent-hover", "accent-active"]) expect(parseHsl(light[name])[0]).toBe(0);
  });

  it("design audit B1: the retired tokens are gone", () => {
    for (const name of ["accent-light", "gradient-accent", "gradient-gold", "shadow-glow", "shadow-accent", "transition-bounce", "transition-smooth"]) {
      expect(light).not.toHaveProperty(name);
    }
  });

  it("design audit B1: decorative tokens are measured and stay decorative", () => {
    // --brand-azure is 4.14:1 on white: icons, rules and text of 24 px or more only (1.4.3 large text).
    expect(contrastRatio(t("brand-azure"), WHITE)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(contrastRatio(t("brand-azure"), WHITE)).toBeLessThan(TEXT);
    // --border-strong separates surfaces only; it is never a control boundary (that is --input).
    expect(contrastRatio(t("border-strong"), t("surface-subtle"))).toBeGreaterThan(contrastRatio(t("border"), t("surface-subtle")));
  });

  it("keeps the CTA a saturated brand red, not a redesign", () => {
    const [h, s, l] = parseHsl(light.accent);
    expect(h).toBe(0);
    expect(s).toBeGreaterThanOrEqual(80);
    expect(l).toBeGreaterThanOrEqual(40);
  });
});
