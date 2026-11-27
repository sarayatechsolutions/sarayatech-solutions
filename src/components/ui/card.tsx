import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";
import { cardVariants, type CardVariantProps } from "./card-variants";

type CardProps = React.HTMLAttributes<HTMLDivElement> &
  CardVariantProps & {
    /** Render the child element (an `<li>`, `<article>`) with the card classes. */
    asChild?: boolean;
  };

/** See card-variants.ts for the variants (design audit B5, spec 3.3). */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, interactive, highlighted, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return <Comp ref={ref} className={cn(cardVariants({ padding, interactive, highlighted }), className)} {...props} />;
  },
);
Card.displayName = "Card";

/**
 * The image on top of a media card (proof, Our Work): the card's top corners, a muted
 * placeholder while the image loads, and a fixed ratio so nothing shifts. Use with
 * `padding="none"` on the Card and put the text in a `CardBody`.
 */
const CardMedia = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("aspect-video overflow-hidden rounded-t-lg bg-muted", className)} {...props} />
  ),
);
CardMedia.displayName = "CardMedia";

/** The padded text column of a media card; grows so a CTA can sit at the bottom. */
const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-1 flex-col gap-2 p-6", className)} {...props} />
  ),
);
CardBody.displayName = "CardBody";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardMedia, CardBody, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
