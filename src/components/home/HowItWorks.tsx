import { HOW_IT_WORKS } from "./content";

/** Four steps, in order (STS-031, REQ-059). */
const HowItWorks = () => (
  <section data-home-section="how-it-works" aria-labelledby="home-how-heading" className="py-20 bg-background">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h2 id="home-how-heading" className="text-3xl md:text-4xl font-bold text-center mb-12">
        {HOW_IT_WORKS.heading}
      </h2>

      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.steps.map((step, index) => (
          <li key={step.title} className="bg-card rounded-2xl p-6 shadow-card border border-border">
            <span
              aria-hidden="true"
              className="mb-4 flex w-10 h-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold"
            >
              {index + 1}
            </span>
            <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-foreground/80 leading-relaxed">{step.copy}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
