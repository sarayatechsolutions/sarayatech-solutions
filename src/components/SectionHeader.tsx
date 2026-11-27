import type { ReactNode } from "react";

interface SectionHeaderProps {
  /** Id of the h2, for the section's aria-labelledby. */
  id: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  lead?: ReactNode;
  /**
   * "start" everywhere except statement sections (design audit FD-24): only a one-line heading
   * and a short lead-in may be centred.
   */
  align?: "start" | "center";
  className?: string;
}

/**
 * Section header (design audit B4, section 3.4): optional eyebrow, the h2, an optional lead
 * capped at the measure. 12 px eyebrow-to-title, 16 px title-to-lead, and 32 px (40 px at lg) to the
 * content below. Type-scale classes are written out, never passed through cn().
 */
const SectionHeader = ({ id, title, eyebrow, lead, align = "start", className = "" }: SectionHeaderProps) => {
  const centered = align === "center";
  return (
    <div className={`${centered ? "mx-auto text-center" : ""} max-w-3xl mb-8 lg:mb-10 ${className}`.trim()}>
      {eyebrow ? <p className="text-eyebrow uppercase text-secondary mb-3">{eyebrow}</p> : null}
      <h2 id={id} className="text-h2 text-foreground text-balance">
        {title}
      </h2>
      {lead ? (
        <p className={`text-body-lg text-muted-foreground max-w-measure mt-4 ${centered ? "mx-auto" : ""}`.trim()}>
          {lead}
        </p>
      ) : null}
    </div>
  );
};

export default SectionHeader;
