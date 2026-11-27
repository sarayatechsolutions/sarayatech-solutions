import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AminaChatbot from "./AminaChatbot";

// STS-062 (WCAG 2.2.2 Pause, Stop, Hide). The launcher's waves, gradient sheen and icon bob used to
// loop forever (framer-motion `repeat: Infinity`). They are now CSS animations with a finite
// iteration count, defined in src/index.css, that all end within 5 s and come to rest.
// B8 / A11 changed this file on purpose: two --gold waves (not three) to 1.6x, no sheen, all over by
// 3.5 s; the launcher lives in ChatLauncher.tsx and the typing dots in ChatPanel.tsx (FF-11).
// jsdom does not run CSS, so this reads the rules from the stylesheet and the classes from the DOM.
const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
const launcherSource = readFileSync(resolve(__dirname, "ChatLauncher.tsx"), "utf8");
const panelSource = readFileSync(resolve(__dirname, "ChatPanel.tsx"), "utf8");
const source = [readFileSync(resolve(__dirname, "AminaChatbot.tsx"), "utf8"), launcherSource, panelSource].join("\n");

/** WCAG 2.2.2: moving content that starts on its own may last at most 5 s without a pause control. */
const LIMIT_S = 5;

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);

/** The text of the block that starts at `pattern`, braces balanced. */
function block(text: string, pattern: RegExp): string {
  const start = text.search(pattern);
  expect(start, String(pattern)).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = text.indexOf("{", start); i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("unbalanced braces");
}

const seconds = (v: string) => (v.endsWith("ms") ? parseFloat(v) / 1000 : parseFloat(v));

/** Parses the single `animation:` shorthand of `.cls` into its timing. */
function animationOf(cls: string) {
  const body = block(css, new RegExp(String.raw`\.${cls}\s*\{`));
  // No longhand can sneak an infinite loop back in either.
  expect(body).not.toMatch(/infinite/);
  const decl = body.match(/animation:\s*([^;]+);/);
  expect(decl, `.${cls} has an animation shorthand`).not.toBeNull();
  // Drop the commas inside cubic-bezier(...), then a remaining comma would mean a second animation.
  const value = decl![1].replace(/\([^)]*\)/g, "()").trim();
  expect(value).not.toContain(",");
  const tokens = value.split(/\s+/);
  const times = tokens.filter((tk) => /^\d*\.?\d+m?s$/.test(tk)).map(seconds);
  const counts = tokens.filter((tk) => /^\d*\.?\d+$/.test(tk)).map(Number);
  return { name: tokens[0], duration: times[0], delay: times[1] ?? 0, iterations: counts[0] ?? 1 };
}

function renderLauncher() {
  render(
    <MemoryRouter>
      <AminaChatbot />
    </MemoryRouter>,
  );
  const button = screen.getByRole("button", { name: /open chat/i });
  const container = button.parentElement as HTMLElement;
  return { button, container };
}

describe("chat launcher motion is finite (STS-062, WCAG 2.2.2)", () => {
  it("binds the two waves and the icon bob to the chat-launcher-* CSS animations", () => {
    const { button, container } = renderLauncher();
    const rings = [...container.children].filter((el) => el !== button);
    expect(rings).toHaveLength(2);
    rings.forEach((ring, i) => expect(classes(ring)).toEqual(expect.arrayContaining([`chat-launcher-wave-${i + 1}`, "bg-gold"])));
    expect(classes(button).filter((c) => c.startsWith("chat-launcher-"))).toEqual([]);
    expect(classes(container.querySelector("[data-chat-launcher-icon]"))).toContain("chat-launcher-bob");
  });

  it("every launcher animation is a finite iteration count that ends within 5 s", () => {
    const { container } = renderLauncher();
    const animated = new Set(
      [container, ...container.querySelectorAll("*")].flatMap((el) => classes(el).filter((c) => c.startsWith("chat-launcher-"))),
    );
    expect([...animated].sort()).toEqual(["chat-launcher-bob", "chat-launcher-wave-1", "chat-launcher-wave-2"]);
    let longest = 0;
    for (const cls of animated) {
      const a = animationOf(cls);
      expect(css, `@keyframes ${a.name} exists`).toMatch(new RegExp(String.raw`@keyframes\s+${a.name}\s*\{`));
      expect(Number.isInteger(a.iterations) && a.iterations >= 1 && a.iterations <= 3, `${cls}: ${a.iterations} iterations`).toBe(true);
      const end = a.delay + a.duration * a.iterations;
      expect(end, `${cls} ends at ${end}s`).toBeLessThanOrEqual(LIMIT_S);
      longest = Math.max(longest, end);
    }
    // The documented budget (docs/design/design-system.md, A11): all motion over at 3.5 s.
    expect(longest).toBeCloseTo(3.5, 5);
  });

  it("no utility on an animated element overrides the CSS timing (tailwindcss-animate's duration-*, delay-*, ...)", () => {
    // Found in Chromium at 390 px: `duration-300` on the launcher button also set animation-duration
    // (tailwindcss-animate), so utilities, which come after the components layer, cut the 4 s sheen to 0.3 s.
    const { container } = renderLauncher();
    for (const el of [container, ...container.querySelectorAll("*")]) {
      const own = classes(el);
      if (!own.some((c) => c.startsWith("chat-launcher-"))) continue;
      expect(own.filter((c) => /^(duration|delay|ease|repeat|fill-mode|direction|running|paused)(-|$)/.test(c))).toEqual([]);
    }
  });

  it("comes to rest: the last keyframe is the static state, and the end state is held", () => {
    const wave = block(css, /@keyframes\s+chat-launcher-wave\s*\{/);
    expect(block(wave, /100%\s*\{/)).toMatch(/opacity:\s*0\s*;/);
    // A11: from the button's size at 35 % to 1.6x, gone.
    expect(block(wave, /0%\s*\{/)).toMatch(/transform:\s*scale\(1\)\s*;\s*opacity:\s*0?\.35\s*;/);
    expect(block(wave, /100%\s*\{/)).toMatch(/transform:\s*scale\(1\.6\)/);
    expect(css).not.toMatch(/chat-launcher-sheen/);
    expect(block(css, /@keyframes\s+chat-launcher-bob\s*\{/)).toMatch(/0%,\s*100%\s*\{\s*transform:\s*translateY\(0\)/);
    // `both` keeps the rings at opacity 0 after the last wave instead of snapping back to a solid disc.
    for (const n of [1, 2]) expect(block(css, new RegExp(String.raw`\.chat-launcher-wave-${n}\s*\{`))).toMatch(/\bboth;/);
  });

  it("nothing in the launcher is driven by a framer-motion loop any more", () => {
    const launcher = launcherSource.slice(launcherSource.indexOf("// Floating Chat Button"), launcherSource.indexOf("// End Floating Chat Button"));
    expect(launcher.length).toBeGreaterThan(0);
    expect(launcher).not.toMatch(/Infinity|repeat\s*:/);
    // No Tailwind built-in looping animation (animate-ping, -pulse, -spin, -bounce) either.
    const { container } = renderLauncher();
    for (const el of [container, ...container.querySelectorAll("*")]) {
      expect(classes(el).filter((c) => /^animate-(?!none$)/.test(c))).toEqual([]);
      expect((el as HTMLElement).style.transform).toBe("");
      expect(el.getAttribute("style") ?? "").not.toMatch(/animation/);
    }
  });
});

describe("chat launcher under prefers-reduced-motion (STS-041, kept by STS-062)", () => {
  it("hides the waves, switches the bob off and keeps the hover lift motion-safe only", () => {
    const { button, container } = renderLauncher();
    const rings = [...container.children].filter((el) => el !== button);
    for (const ring of rings) expect(classes(ring)).toEqual(expect.arrayContaining(["pointer-events-none", "motion-reduce:hidden"]));
    expect(classes(button).filter((c) => /translate|scale/.test(c))).toEqual(["motion-safe:hover:-translate-y-0.5"]);
    expect(classes(container.querySelector("[data-chat-launcher-icon]"))).toContain("motion-reduce:animate-none");
  });

  it("defines the launcher animations in the components layer, so the motion-reduce utilities override them", () => {
    // Tailwind emits @layer components before utilities: `motion-reduce:animate-none` (a utility) wins
    // over `.chat-launcher-*` at equal specificity. Unlayered rules would come last and win instead.
    let rest = css;
    let found = false;
    while (rest.search(/@layer components\s*\{/) >= 0) {
      const layer = block(rest, /@layer components\s*\{/);
      if (/\.chat-launcher-wave-1\s*\{/.test(layer)) {
        for (const cls of ["chat-launcher-wave-2", "chat-launcher-bob"]) {
          expect(layer).toMatch(new RegExp(String.raw`\.${cls}\s*\{`));
        }
        found = true;
        break;
      }
      rest = rest.slice(rest.indexOf(layer) + layer.length);
    }
    expect(found).toBe(true);
  });
});

describe("typing indicator motion is finite (STS-066, WCAG 2.2.2)", () => {
  it("no framer-motion loop is infinite anywhere in the chatbot", () => {
    expect(source).not.toMatch(/repeat\s*:\s*Infinity/);
  });

  it("the three dots end within 5 s: 0.6 s x (1 + repeats) + the last delay", async () => {
    const { TYPING_DOT_REPEATS } = await import("./ChatPanel");
    const delays = [...panelSource.matchAll(/repeat: TYPING_DOT_REPEATS, delay: ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(delays).toEqual([0, 0.2, 0.4]);
    expect(0.6 * (1 + TYPING_DOT_REPEATS) + Math.max(...delays)).toBeLessThanOrEqual(LIMIT_S);
  });

  it("announces typing as text in a status region and hides the decorative dots", () => {
    expect(panelSource).toMatch(/role="status">\s*<span className="sr-only">Amina is typing<\/span>\s*<div className="flex gap-1" aria-hidden="true">/);
  });
});

describe("chat panel motion (B8 / A10)", () => {
  it("opens slow / enter from 12 px below at 98 %, and closes base / exit", () => {
    const motion = block(panelSource, /const PANEL_MOTION = \{/);
    expect(motion).toMatch(/initial: \{ opacity: 0, y: 12, scale: 0\.98 \}/);
    // --duration-slow 320 ms with --ease-enter; --duration-base 200 ms with --ease-exit.
    expect(motion).toMatch(/animate: \{[^}]*duration: 0\.32, ease: \[0, 0, 0\.2, 1\]/);
    expect(motion).toMatch(/exit: \{[^}]*duration: 0\.2, ease: \[0\.4, 0, 1, 1\]/);
    // No height animation: the panel switches height instantly when minimized.
    expect(panelSource).not.toMatch(/height:\s*isMinimized/);
  });
});
