import { PROBLEM } from "./content";

/**
 * "Running a business is hard enough." (STS-031, REQ-053). Source text verbatim. A statement
 * section (design audit FD-24): the one-line heading is centred, the paragraph is start-aligned
 * at the measure under it.
 */
const ProblemSection = () => (
  <section data-home-section="problem" aria-labelledby="home-problem-heading" className="section bg-background">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-measure space-y-6">
        <h2 id="home-problem-heading" className="text-h2 text-foreground text-center text-balance">
          {PROBLEM.heading}
        </h2>
        <p className="text-body-lg text-foreground/80">{PROBLEM.copy}</p>
      </div>
    </div>
  </section>
);

export default ProblemSection;
