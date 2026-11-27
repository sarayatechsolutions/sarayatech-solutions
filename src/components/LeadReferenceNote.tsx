import type { ReactNode } from "react";
import { LEAD_REFERENCE_COPY } from "@/content/forms/lead-reference";

type LeadReferenceNoteProps = {
  /** Already checked by src/lib/contact-submit.ts (LEAD_REFERENCE_PATTERN); never raw server text. */
  reference: string;
  /** `span` when it sits inside an existing paragraph. */
  as?: "p" | "span";
  className?: string;
  /** Design audit B6: a control drawn right after the code (the success panel's copy button). */
  action?: ReactNode;
};

/**
 * "Your reference: REF-7K3QX9PM. Mention it if you contact us about this request." (STS-084)
 *
 * It renders inside each form's success panel, so the status live region announces it with the
 * rest. The meaning is carried by the text; the monospace only makes the code easier to read and
 * copy. With an `action`, the code and the control share one bordered chip.
 */
const LeadReferenceNote = ({ reference, as: Tag = "p", className = "", action }: LeadReferenceNoteProps) => {
  const code = (
    <span data-lead-reference className="font-mono font-semibold whitespace-nowrap select-all">
      {reference}
    </span>
  );
  return (
    <Tag data-lead-reference-note className={className || undefined}>
      {LEAD_REFERENCE_COPY.prefix}
      {action ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-background py-0 pl-3 align-middle">
          {code}
          {action}
        </span>
      ) : (
        code
      )}
      {LEAD_REFERENCE_COPY.suffix}
    </Tag>
  );
};

export default LeadReferenceNote;
