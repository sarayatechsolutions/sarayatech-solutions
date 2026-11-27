import { forwardRef, useEffect, useRef, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link, useInRouterContext } from "react-router-dom";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadReferenceNote from "@/components/LeadReferenceNote";
import { LEAD_REFERENCE_COPY_BUTTON } from "@/content/forms/lead-reference";
import { FORM_SUCCESS_LINKS } from "@/content/forms/form-success";
import { FIELD_SCROLL_MARGIN } from "./FormField";

/** Copies the reference; the result is said in a polite live region and shown next to the button. */
const CopyReference = ({ reference }: { reference: string }) => {
  const [said, setSaid] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setSaid(LEAD_REFERENCE_COPY_BUTTON.copied);
    } catch {
      // No clipboard (insecure context, permission refused): the code is select-all instead.
      setSaid(LEAD_REFERENCE_COPY_BUTTON.failed);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaid(""), 4000);
  };

  return (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label={LEAD_REFERENCE_COPY_BUTTON.label} onClick={copy}>
        <Copy aria-hidden="true" />
      </Button>
      <span data-copy-status aria-live="polite" className="pr-2 font-sans text-sm font-semibold text-success empty:hidden">
        {said}
      </span>
    </>
  );
};

/** A router Link inside the app; a plain anchor when a page is rendered alone in a unit test. */
const InternalLink = forwardRef<HTMLAnchorElement, { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ to, children, ...rest }, ref) =>
    useInRouterContext() ? (
      <Link ref={ref} to={to} {...rest}>
        {children}
      </Link>
    ) : (
      <a ref={ref} href={to} {...rest}>
        {children}
      </a>
    ),
);
InternalLink.displayName = "InternalLink";

interface FormSuccessProps {
  headingId: string;
  heading: string;
  body: ReactNode;
  /** Already checked against LEAD_REFERENCE_PATTERN; null when the backend sent none. */
  reference: string | null;
  /** Data attributes for the text block (heading, body, reference), e.g. data-audit-success. */
  textAttrs?: Record<`data-${string}`, string>;
}

/**
 * The confirmation that replaces a form once it is sent (design audit B6; FF-1).
 *
 * Render it inside a `role="status"` region that is always mounted, so it is announced. On mount
 * its heading takes focus (tabIndex -1, no ring) and the panel scrolls into view below the fixed
 * header, so a visitor who pressed the button at the bottom of a long form sees it at once.
 * Then a next step: "See our work" (outline) and "Back to home" (link).
 */
const FormSuccess = ({ headingId, heading, body, reference, textAttrs }: FormSuccessProps) => {
  const panel = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView?.({ block: "nearest" });
  }, []);

  return (
    <div
      ref={panel}
      data-form-success=""
      className={`rounded-lg border border-success/30 bg-success-surface p-6 lg:p-8 ${FIELD_SCROLL_MARGIN}`}
    >
      <CheckCircle2 aria-hidden="true" className="h-10 w-10 text-success" />
      <div {...textAttrs} className="mt-4 space-y-3 max-w-measure">
        <h2 ref={title} id={headingId} tabIndex={-1} className="text-h3 text-foreground focus:outline-none">
          {heading}
        </h2>
        <p className="text-foreground/80">{body}</p>
        {reference && (
          <LeadReferenceNote reference={reference} className="text-foreground/80" action={<CopyReference reference={reference} />} />
        )}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild variant="outline" size="md" className="w-full sm:w-auto">
          <InternalLink to={FORM_SUCCESS_LINKS.work.href}>{FORM_SUCCESS_LINKS.work.label}</InternalLink>
        </Button>
        <Button asChild variant="link" size="md" className="w-full sm:w-auto">
          <InternalLink to={FORM_SUCCESS_LINKS.home.href}>{FORM_SUCCESS_LINKS.home.label}</InternalLink>
        </Button>
      </div>
    </div>
  );
};

export default FormSuccess;
