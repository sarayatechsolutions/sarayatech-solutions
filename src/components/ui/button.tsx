import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button system (design audit 2026-11-27, section 3.2, batch B3).
 *
 * Callers pick a variant and a size and add layout only (`w-full sm:w-auto`, margins). They never
 * restate colour, height or whitespace: `grep "bg-accent hover:bg-accent"` must find this file only.
 *
 * - Every size is at least 44 px tall (md 44, lg 48, xl 56, icon 44 x 44).
 * - Hover and pressed go darker, never lighter; ghost and outline hover are never red.
 * - Focus: the base `:focus-visible` rule in src/index.css (navy outline, white halo). `on-dark`
 *   switches it to a white outline with a navy halo.
 * - Only colour, border, shadow and transform transition (A1, A2); the press nudge is motion-safe.
 * - Loading is disabled but keeps full opacity (`aria-busy:opacity-100`): the request is in progress,
 *   and "Sending..." stays at the variant's full contrast (5.01:1 on primary) instead of fading to 50%.
 *
 * Font sizes use Tailwind's default keys (text-base / text-lg / text-xl), not the custom type
 * scale: tailwind-merge would read `text-body` as a colour and drop it.
 */
const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 rounded-md text-center transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-standard motion-safe:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-busy:cursor-wait aria-busy:opacity-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** The conversion action, at most one per view. */
        primary: "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active",
        /** Header CTA, highlighted package. */
        secondary: "bg-primary text-primary-foreground hover:bg-primary-light active:bg-primary-dark",
        /** Secondary action on a light surface. */
        outline: "border border-primary/30 bg-background text-primary hover:border-primary hover:bg-muted active:bg-border",
        /** Secondary action on navy (hero, FinalCta). */
        "on-dark":
          "border border-white/60 bg-white/10 text-white hover:border-white hover:bg-white/20 active:bg-white/25 focus-visible:outline-white focus-visible:shadow-[0_0_0_2px_hsl(var(--primary-dark))]",
        /** Toolbars, chat header. */
        ghost: "text-primary hover:bg-muted active:bg-border",
        /** Inline. */
        link: "text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary",
        /** Legacy shadcn names, kept so ui/ primitives and unrouted pages still type-check. */
        default: "bg-primary text-primary-foreground hover:bg-primary-light active:bg-primary-dark",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        /** 44 px: forms, cards. */
        md: "min-h-11 px-5 py-2 text-base font-semibold",
        /** 48 px: package cards, 404. */
        lg: "min-h-12 px-6 py-2 text-base font-bold",
        /** 56 px, wraps: hero, FinalCta, form submit. */
        xl: "min-h-14 h-auto px-7 py-3 whitespace-normal text-lg font-bold sm:text-xl [&_svg]:size-5",
        /** 44 x 44: must carry an aria-label. */
        icon: "h-11 w-11 shrink-0",
        /** Legacy shadcn names, both mapped to md so nothing drops under 44 px. */
        default: "min-h-11 px-5 py-2 text-base font-semibold",
        sm: "min-h-11 px-5 py-2 text-base font-semibold",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

/** Label shown while `loading` (the forms' existing "Sending..." string). */
export const BUTTON_LOADING_LABEL = "Sending...";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Trailing icon (an arrow). It nudges 2 px on hover, motion-safe only (A3). Mark it aria-hidden. */
  iconEnd?: React.ReactNode;
  /**
   * Request pending: a 16 px spinner (a static dot under reduced motion) before `loadingLabel`,
   * `aria-busy` and `disabled`, and the width held at its resting width so the button does not jump.
   * Native buttons only; a link never loads.
   */
  loading?: boolean;
  loadingLabel?: React.ReactNode;
}

// The prerender (renderToString) has no layout; useEffect there avoids React's server warning.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

const Spinner = () => (
  <span
    aria-hidden="true"
    data-button-spinner=""
    className="inline-block size-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:size-2 motion-reduce:border-0 motion-reduce:bg-current"
  />
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, iconEnd, loading = false, loadingLabel = BUTTON_LOADING_LABEL, children, disabled, style, ...props },
    forwardedRef,
  ) => {
    const innerRef = React.useRef<HTMLButtonElement | null>(null);
    const restWidth = React.useRef(0);
    const setRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    // Remember the resting width after every resting render; while loading, hold it as min-width.
    useIsomorphicLayoutEffect(() => {
      if (!loading && innerRef.current) restWidth.current = innerRef.current.offsetWidth;
    });

    const end = iconEnd ? (
      <span aria-hidden="true" className="inline-flex transition-transform duration-fast ease-standard motion-safe:group-hover:translate-x-0.5">
        {iconEnd}
      </span>
    ) : null;
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild) {
      // A link never loads, so nothing is measured: pass the caller's ref through untouched (and none
      // at all when there is none, so a plain function child such as CtaLink gets no ref warning).
      return (
        <Slot className={classes} ref={forwardedRef} style={style} {...props}>
          <Slottable>{children}</Slottable>
          {end}
        </Slot>
      );
    }

    const busy = loading;
    const lockedStyle = busy && restWidth.current > 0 ? { ...style, minWidth: `${restWidth.current}px` } : style;
    return (
      <button
        className={classes}
        ref={setRef}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        style={lockedStyle}
        {...props}
      >
        {busy ? (
          <>
            <Spinner />
            {loadingLabel}
          </>
        ) : (
          <>
            {children}
            {end}
          </>
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
