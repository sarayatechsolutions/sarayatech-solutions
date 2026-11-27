import type { ChangeEvent } from "react";
import { LEAD_SOURCE_FIELD, LEAD_SOURCE_OPTIONS } from "@/content/forms/lead-source";
import { FieldHint, FieldLabel, NativeSelect } from "@/components/form/FormField";

type LeadSourceSelectProps = {
  /** The select's id; the hint gets `${id}-hint`. */
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

/**
 * "How did you hear about us?" (STS-054), shared by the contact and free-audit forms.
 *
 * A native <select>, not the Radix one: it is labelled, keyboard- and screen-reader-operable
 * before any script runs, so the prerendered HTML already carries the five options. STS-041
 * patterns: a real <label for>, the hint tied by aria-describedby, the `input` border token and the
 * shared focus ring. Design audit B6: the form system's NativeSelect, 48 px like every input.
 */
const LeadSourceSelect = ({ id, value, onChange }: LeadSourceSelectProps) => {
  const hintId = `${id}-hint`;
  return (
    <div>
      <FieldLabel htmlFor={id}>{LEAD_SOURCE_FIELD.label}</FieldLabel>
      <NativeSelect id={id} name="source" value={value} onChange={onChange} aria-describedby={hintId}>
        <option value="">{LEAD_SOURCE_FIELD.emptyOption}</option>
        {LEAD_SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
      <FieldHint id={hintId}>{LEAD_SOURCE_FIELD.hint}</FieldHint>
    </div>
  );
};

export default LeadSourceSelect;
