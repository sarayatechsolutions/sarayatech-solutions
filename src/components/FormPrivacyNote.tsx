import { FORM_PRIVACY_NOTE, PRIVACY_PATH } from "@/content/legal/legal";

/**
 * The privacy line next to a form's submit button (STS-037, REQ-173). Its wording agrees with
 * /privacy; the link opens a new tab so a half-filled form is not lost.
 */
const FormPrivacyNote = ({ className = "" }: { className?: string }) => (
  <p data-form-privacy-note className={`text-sm text-secondary ${className}`}>
    {FORM_PRIVACY_NOTE.text}{" "}
    <a
      href={PRIVACY_PATH}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {FORM_PRIVACY_NOTE.linkText}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
    .
  </p>
);

export default FormPrivacyNote;
