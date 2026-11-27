import type { LucideIcon } from "lucide-react";

/**
 * The 44 px flat icon tile (design audit spec 3.3, B5): `rounded-md bg-primary`, a 22 px lucide
 * icon, decorative (`aria-hidden`): the text next to it carries the meaning. Replaces every
 * `gradient-primary` tile.
 */
export const IconTile = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
    <Icon className="h-[22px] w-[22px]" />
  </span>
);
