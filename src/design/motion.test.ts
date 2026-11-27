import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import tailwindConfig from "../../tailwind.config";
import { DURATION, EASE } from "./motion";

// The framer-motion mirror of the B1 motion tokens must match src/index.css and the Tailwind theme.
const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const cssVar = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--${name} is not defined in index.css`);
  return m[1].trim();
};
const bezier = (value: string) =>
  (value.match(/cubic-bezier\(([^)]+)\)/)?.[1] ?? "").split(",").map((n) => Number(n.trim()));
const theme = tailwindConfig.theme?.extend as {
  transitionDuration: Record<string, string>;
  transitionTimingFunction: Record<string, string>;
};

describe("motion tokens for framer-motion (design audit B1, section 3.7)", () => {
  it.each(Object.entries(DURATION))("duration %s matches --duration-%s and the Tailwind duration", (name, seconds) => {
    expect(cssVar(`duration-${name}`)).toBe(`${Math.round(seconds * 1000)}ms`);
    expect(theme.transitionDuration[name]).toBe(`${Math.round(seconds * 1000)}ms`);
  });

  it.each(Object.entries(EASE))("easing %s matches --ease-%s and the Tailwind easing", (name, points) => {
    expect(bezier(cssVar(`ease-${name}`))).toEqual([...points]);
    expect(bezier(theme.transitionTimingFunction[name])).toEqual([...points]);
  });

  it("covers every duration and easing the CSS defines", () => {
    const names = (prefix: string) => [...css.matchAll(new RegExp(`--${prefix}-([\\w-]+):`, "g"))].map((m) => m[1]);
    expect(names("duration").sort()).toEqual(Object.keys(DURATION).sort());
    expect(names("ease").sort()).toEqual(Object.keys(EASE).sort());
  });
});
