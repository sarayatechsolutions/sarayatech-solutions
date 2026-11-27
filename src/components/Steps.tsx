export interface Step {
  /** Optional: a step can be one sentence (Pricing "How a quote works"). No trailing period. */
  title?: string;
  copy?: string;
}

const LG_COLS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/**
 * Numbered steps (design audit B5, spec 3.4), shared by How it works, the service-page process
 * and Pricing "How a quote works". An `<ol>`, so the order is announced; the 40 px navy numeral is
 * decoration (aria-hidden) on top of it.
 *
 * Mobile first: a vertical list with a dashed connector down the left, from one circle to the
 * next. At lg: one row, the connector running along the circles' midline to the next column.
 * Step titles are h3 (every caller sits under a section h2).
 */
const Steps = ({ items, className = "" }: { items: readonly Step[]; className?: string }) => {
  const cols = LG_COLS[items.length] ?? "lg:grid-cols-4";
  return (
    <ol className={`grid gap-8 lg:gap-6 ${cols} ${className}`.trim()}>
      {items.map((step, i) => (
        <li key={step.title ?? step.copy} className="relative flex gap-4 lg:flex-col lg:gap-4">
          {i < items.length - 1 ? (
            <span
              aria-hidden="true"
              data-step-connector
              className="absolute left-5 top-12 -bottom-6 border-l-2 border-dashed border-border-strong lg:left-14 lg:-right-4 lg:top-5 lg:bottom-auto lg:border-l-0 lg:border-t-2"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold"
          >
            {i + 1}
          </span>
          <div className="space-y-1 pt-1.5 lg:pt-0">
            {step.title ? <h3 className="text-h4 text-foreground">{step.title}</h3> : null}
            {step.copy ? (
              <p className={step.title ? "text-foreground/80 leading-relaxed max-w-measure" : "text-body-lg text-foreground/80 max-w-measure"}>
                {step.copy}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default Steps;
