import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { FIELD_SCROLL_MARGIN } from "./FormField";

interface FormErrorProps {
  /** The visible, announced failure. Empty: nothing is drawn. */
  message: string;
  /** Screen-reader-only line while fields are invalid and there is no failure (sr-only). */
  summary?: string;
  /** Extra content inside the box (e.g. a verified booking link). */
  children?: ReactNode;
  id?: string;
  attrs?: Record<`data-${string}`, string>;
}

/**
 * Form-level error (design audit B6; FF-1). It sits right above the submit button, where the
 * visitor is looking when the request fails, inside a live region that is always mounted so the
 * message is announced the moment it appears. When a message appears the box also takes focus
 * (tabIndex -1, so it draws no ring) and so scrolls into view, below the fixed header. What the
 * visitor typed is never cleared on failure.
 */
const FormError = ({ message, summary, children, id, attrs }: FormErrorProps) => {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) box.current?.focus();
  }, [message]);

  return (
    <div aria-live="assertive" aria-atomic="true">
      {message ? (
        <div
          ref={box}
          id={id}
          role="alert"
          tabIndex={-1}
          data-form-error=""
          {...attrs}
          className={`flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive-surface p-4 text-foreground focus:outline-none ${FIELD_SCROLL_MARGIN}`}
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0 space-y-1">
            <p>{message}</p>
            {children}
          </div>
        </div>
      ) : summary ? (
        <p role="alert" className="sr-only">
          {summary}
        </p>
      ) : null}
    </div>
  );
};

export default FormError;
