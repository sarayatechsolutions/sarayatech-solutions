import SectionHeader from "@/components/SectionHeader";
import Steps from "@/components/Steps";
import { HOW_IT_WORKS } from "./content";

/** Four steps, in order (STS-031, REQ-059), as the shared numbered steps (design audit B5). */
const HowItWorks = () => (
  <section data-home-section="how-it-works" aria-labelledby="home-how-heading" className="section bg-background">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeader id="home-how-heading" title={HOW_IT_WORKS.heading} />
      <Steps items={HOW_IT_WORKS.steps} />
    </div>
  </section>
);

export default HowItWorks;
