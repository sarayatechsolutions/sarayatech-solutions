import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Form system (design audit 2026-11-27, section 3.6, batch B6). Shared by /contact and /free-audit.
 *
 * - The label sits above the control, `text-small font-semibold`, with a visual `*` hidden from
 *   screen readers (they get "required" from the control itself).
 * - Every control is 48 px tall with 16 px text at every width (no `md:text-sm`, so iOS never zooms).
 * - A hint is tied by aria-describedby; an error adds its own id first, draws the border in
 *   `destructive` and pairs the message with an icon, so the state is never colour alone.
 * - `scroll-mt-field` keeps a field that receives focus (first invalid field on submit, a hash
 *   jump) about 2.5rem below the fixed header instead of under it.
 *
 * Type-scale keys (`text-small`) are kept out of `cn()` next to a colour: tailwind-merge would
 * read them as a colour and drop one of the two.
 */

/** Focus lands 2.5rem below the fixed header (FF: form fields). */
export const FIELD_SCROLL_MARGIN = "scroll-mt-[calc(var(--header-h)+2.5rem)]";

/** The box every text control shares (Input, Textarea, NativeSelect). */
export const FIELD_CONTROL =
  "w-full rounded-md border border-input bg-background text-base text-foreground ring-offset-background transition-colors duration-fast ease-standard placeholder:text-muted-foreground hover:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive";

export const FIELD_LABEL = "mb-2 block text-small font-semibold text-foreground";
export const FIELD_HINT = "mt-2 text-small text-secondary";

/** The ids an error and a hint add to aria-describedby, error first. */
export const describedBy = (...ids: (string | null | undefined | false)[]): string | undefined => {
  const list = ids.filter(Boolean);
  return list.length ? list.join(" ") : undefined;
};

export const FieldLabel = ({ htmlFor, required = false, children }: { htmlFor: string; required?: boolean; children: ReactNode }) => (
  <label htmlFor={htmlFor} className={FIELD_LABEL}>
    {children}
    {required && (
      <>
        {" "}
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      </>
    )}
  </label>
);

export const FieldHint = ({ id, children }: { id: string; children: ReactNode }) => (
  <p id={id} className={FIELD_HINT}>
    {children}
  </p>
);

/** The inline message under an invalid field. The icon is decorative: the text carries the meaning. */
export const FieldError = ({ id, children }: { id: string; children?: ReactNode }) =>
  children ? (
    <p id={id} data-field-error className="mt-2 flex items-start gap-2 text-small text-destructive">
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  ) : null;

type FieldA11y = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

interface FormFieldProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  /** Renders the control with the ids and ARIA state this field computed. */
  children: (a11y: FieldA11y) => ReactNode;
}

/** Label, control, hint and error, wired together. Ids: `${id}-hint`, `${id}-error`. */
export const FormField = ({ id, label, required = false, hint, error, className, children }: FormFieldProps) => {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy(errorId, hintId),
      })}
      {hint && hintId && <FieldHint id={hintId}>{hint}</FieldHint>}
      {errorId && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
};

/**
 * A native <select>, styled like the inputs: 48 px, `appearance-none` with a ChevronDown on the
 * right. Native on purpose: labelled, keyboard- and screen-reader-operable before any script runs,
 * and the prerendered HTML already carries every option.
 */
export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn("flex h-12 appearance-none py-2 pl-4 pr-11", FIELD_CONTROL, FIELD_SCROLL_MARGIN, className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary"
      />
    </div>
  ),
);
NativeSelect.displayName = "NativeSelect";
