import * as React from "react";

import { cn } from "@/lib/utils";
import { FIELD_CONTROL, FIELD_SCROLL_MARGIN } from "@/components/form/FormField";

/**
 * Design audit B6: 48 px tall (`h-12`, so a caller such as the chat box can still set its own
 * height) with 16 px text at every width; the shared field box, hover, focus ring, invalid border
 * and header-aware scroll margin come from src/components/form/FormField.tsx.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 px-4 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          FIELD_CONTROL,
          FIELD_SCROLL_MARGIN,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
