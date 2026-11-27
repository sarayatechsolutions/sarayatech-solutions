import { cva, type VariantProps } from "class-variance-authority";

/**
 * Card (design audit B5, spec 3.3). One surface for every card on the site: white, 8 px radius,
 * a 1 px border, the xs shadow and a column layout so a CTA can sit at the bottom (`mt-auto`).
 *
 * - `padding`: "default" is 24 px (32 px at lg); "compact" stays 24 px (small bento and step
 *   cards); "none" for media cards, whose body is a `CardBody`.
 * - `interactive`: for a card that is one link (the stretched-link pattern below). Hover lifts
 *   2 px under motion-safe and steps the shadow and border; keyboard focus on the inner link
 *   rings the whole card. Only colour, border, shadow and transform animate (spec 3.1).
 * - `highlighted`: a 2 px primary border. No "Most chosen" badge until the owner confirms one.
 *
 * Kept out of card.tsx so that file exports components only (react-refresh).
 */
export const cardVariants = cva("flex flex-col rounded-lg border bg-card text-card-foreground shadow-xs", {
  variants: {
    padding: {
      default: "p-6 lg:p-8",
      compact: "p-6",
      none: "",
    },
    interactive: {
      true: "relative transition-[transform,box-shadow,border-color] duration-base ease-standard hover:border-border-strong hover:shadow-md motion-safe:hover:-translate-y-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
      false: "",
    },
    highlighted: {
      true: "border-2 border-primary",
      false: "border-border",
    },
  },
  defaultVariants: { padding: "default", interactive: false, highlighted: false },
});

export type CardVariantProps = VariantProps<typeof cardVariants>;

/**
 * The stretched link: put it on the card's one visible link. Its `::after` covers the whole
 * (relative) card, so the card is clickable while the link text stays the only accessible name.
 * Nothing else in the card may be focusable.
 */
export const STRETCHED_LINK =
  "after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none";
