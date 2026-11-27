import { LEAD_REFERENCE_COPY } from "@/content/forms/lead-reference";

type LeadReferenceNoteProps = {
  /** Already checked by src/lib/contact-submit.ts (LEAD_REFERENCE_PATTERN); never raw server text. */
  reference: string;
  /** `span` when it sits inside an existing paragraph (the contact dialog's description). */
  as?: "p" | "span";
  className?: string;
};

/**
 * "Your reference: REF-7K3QX9PM. Mention it if you contact us about this request." (STS-084)
 *
 * It renders inside each form's existing success message, so the live region (/free-audit) or the
 * dialog's description (/contact) announces it with the rest. The meaning is carried by the text;
 * the monospace only makes the code easier to read and copy.
 */
const LeadReferenceNote = ({ reference, as: Tag = "p", className = "" }: LeadReferenceNoteProps) => (
  <Tag data-lead-reference-note className={className || undefined}>
    {LEAD_REFERENCE_COPY.prefix}
    <span data-lead-reference className="font-mono font-semibold whitespace-nowrap select-all">
      {reference}
    </span>
    {LEAD_REFERENCE_COPY.suffix}
  </Tag>
);

export default LeadReferenceNote;
