/**
 * The motion tokens of design audit B1 (section 3.7), for framer-motion.
 *
 * The source of truth is CSS: `--duration-*` and `--ease-*` in src/index.css, exposed to classes as
 * `duration-*` / `ease-*` in tailwind.config.ts. framer-motion takes seconds and bezier arrays, not
 * CSS variables, so this module mirrors those values once; src/design/motion.test.ts fails if the
 * three ever disagree. Components import from here instead of writing 0.2 or [0, 0, 0.2, 1] inline.
 */

/** Seconds. Exits use the step below their entrance (enter `base`, exit `fast`). */
export const DURATION = {
  instant: 0.075,
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
  page: 0.45,
} as const;

/** Cubic-bezier control points. */
export const EASE = {
  standard: [0.2, 0, 0, 1],
  /** Decelerate: things arriving. */
  enter: [0, 0, 0.2, 1],
  /** Accelerate: things leaving. */
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** An entrance and its exit, the pair menus and small panels use (enter base, exit fast). */
export const ENTER_BASE = { duration: DURATION.base, ease: EASE.enter } as const;
export const EXIT_FAST = { duration: DURATION.fast, ease: EASE.exit } as const;
