import { PROBLEM } from "./content";

/** "Running a business is hard enough." (STS-031, REQ-053). Source text verbatim. */
const ProblemSection = () => (
  <section data-home-section="problem" aria-labelledby="home-problem-heading" className="py-20 bg-background">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 id="home-problem-heading" className="text-3xl md:text-4xl font-bold text-foreground">
          {PROBLEM.heading}
        </h2>
        <p className="text-lg md:text-xl text-foreground/80 leading-relaxed">{PROBLEM.copy}</p>
      </div>
    </div>
  </section>
);

export default ProblemSection;
