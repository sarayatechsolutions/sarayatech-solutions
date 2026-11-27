import * as React from "react";

import { cn } from "@/lib/utils";
import { FIELD_CONTROL, FIELD_SCROLL_MARGIN } from "@/components/form/FormField";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Design audit B6: at least 140 px, 16 px text, vertical resize only; the shared field box. */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn("flex min-h-[140px] resize-y px-4 py-3", FIELD_CONTROL, FIELD_SCROLL_MARGIN, className)}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
