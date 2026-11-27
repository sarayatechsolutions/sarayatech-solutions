import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /*
       * The reading measure (design audit B4). Poppins runs wide: 65ch measured 81 characters per
       * line, so the cap is 58ch, about 72 characters, under the audit's 75-character check.
       */
      maxWidth: {
        measure: "58ch",
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: "hsl(var(--secondary-light))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // Design audit B1: hover and pressed are darker steps of the CTA red (there is no lighter
        // `accent-light` any more; B3 removed its last callers).
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
          active: "hsl(var(--accent-active))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          surface: "hsl(var(--success-surface))",
        },
        "destructive-surface": "hsl(var(--destructive-surface))",
        "surface-subtle": "hsl(var(--surface-subtle))",
        "border-strong": "hsl(var(--border-strong))",
        "brand-azure": "hsl(var(--brand-azure))",
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      transitionDuration: {
        instant: "75ms",
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
        page: "450ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2,0,0,1)",
        enter: "cubic-bezier(0,0,0.2,1)",
        exit: "cubic-bezier(0.4,0,1,1)",
      },
      // Design audit B1, section 3.1 type scale. Not used inside the Button cva: tailwind-merge
      // cannot tell these custom keys from text colours.
      fontSize: {
        display: ["clamp(2.5rem, 1.6rem + 3.6vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "800" }],
        h1: ["clamp(2.25rem, 1.7rem + 2.2vw, 3.25rem)", { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "800" }],
        h2: ["clamp(1.75rem, 1.45rem + 1.2vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "700" }],
        h3: ["1.375rem", { lineHeight: "1.3", fontWeight: "700" }],
        h4: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7" }],
        body: ["1rem", { lineHeight: "1.65" }],
        small: ["0.875rem", { lineHeight: "1.5" }],
        eyebrow: ["0.8125rem", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
          to: { height: "0", opacity: "0" },
        },
        // Design audit B1 (A8, A6): short, decelerating entrances; the old 30-50 px slides are gone.
        reveal: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "none" },
        },
        // Design audit B4 (A9): the home hero's project frames, 16 px rise and fade.
        "frame-rise": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "none" },
        },
        "panel-in": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "count-up": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        reveal: "reveal 320ms cubic-bezier(0,0,0.2,1) both",
        "panel-in": "panel-in 200ms cubic-bezier(0,0,0.2,1) both",
        // `backwards`, not `both`: once it ends, the hover lift's transform applies again.
        "frame-rise": "frame-rise 450ms cubic-bezier(0,0,0.2,1) backwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
