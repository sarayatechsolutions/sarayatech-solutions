/**
 * WCAG 2.1 contrast helpers for the design tokens in src/index.css (STS-041).
 *
 * The tokens are HSL triples ("0 85% 47%"), the same strings Tailwind wraps in hsl(var(--x)).
 * These helpers turn them into sRGB, composite translucent colours (text-white/90) over their
 * background, and return the WCAG contrast ratio, so a test can hold every text/background pair
 * the live pages use to 4.5:1 (normal text) or 3:1 (large text, control boundaries, focus rings).
 */
export type Rgb = [number, number, number];

/** Parses "220 70% 25%" (or "220, 70%, 25%") into h, s, l. */
export function parseHsl(value: string): [number, number, number] {
  const parts = value.replace(/,/g, " ").trim().split(/\s+/).map((p) => parseFloat(p));
  if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) {
    throw new Error(`Not an HSL triple: "${value}"`);
  }
  return [parts[0], parts[1], parts[2]];
}

/** HSL (deg, %, %) to sRGB 0-255, per CSS Color 4. */
export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return (light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return [f(0), f(8), f(4)];
}

/** Paints `fg` at `alpha` over the opaque `bg` (what text-white/90 really renders as). */
export function composite(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as Rgb;
}

/** WCAG relative luminance. */
export function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Reads every `--name: h s% l%;` declaration of one selector block (":root" or ".dark") from CSS. */
export function readTokens(css: string, selector = ":root"): Record<string, string> {
  // The token blocks hold no nested braces, so the block runs from "<selector> {" to the next "}".
  const head = css.search(new RegExp(`(^|\\s)${selector.replace(".", "\\.")}\\s*\\{`, "m"));
  if (head < 0) throw new Error(`No ${selector} block found`);
  const open = css.indexOf("{", head);
  const body = css.slice(open + 1, css.indexOf("}", open));
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return tokens;
}

/** The hsl(...) stops of a gradient token such as --gradient-hero, as RGB. */
export function gradientStops(value: string): Rgb[] {
  return [...value.matchAll(/hsl\(([^)]+)\)/g)].map((m) => hslToRgb(...parseHsl(m[1])));
}
