import type { ChangeEvent } from "react";
import { LEAD_SOURCE_FIELD, LEAD_SOURCE_OPTIONS } from "@/content/forms/lead-source";

type LeadSourceSelectProps = {
  /** The select's id; the hint gets `${id}-hint`. */
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  labelClassName?: string;
};

/**
 * "How did you hear about us?" (STS-054), shared by the contact and free-audit forms.
 *
 * A native <select>, not the Radix one: it is labelled, keyboard- and screen-reader-operable
 * before any script runs, so the prerendered HTML already carries the five options. STS-041
 * patterns: a real <label for>, the hint tied by aria-describedby, 44 px tall (h-11), the
 * `input` border token and the shared focus ring.
 */
const LeadSourceSelect = ({ id, value, onChange, labelClassName = "block text-sm font-medium mb-2" }: LeadSourceSelectProps) => {
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {LEAD_SOURCE_FIELD.label}
      </label>
      <select
        id={id}
        name="source"
        value={value}
        onChange={onChange}
        aria-describedby={hintId}
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="">{LEAD_SOURCE_FIELD.emptyOption}</option>
        {LEAD_SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <p id={hintId} className="mt-2 text-sm text-secondary">
        {LEAD_SOURCE_FIELD.hint}
      </p>
    </div>
  );
};

export default LeadSourceSelect;
