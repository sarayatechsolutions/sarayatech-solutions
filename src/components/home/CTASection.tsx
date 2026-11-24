import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FINAL_CTA, FREE_AUDIT_PATH } from "./content";

/**
 * Final call to action (STS-031, REQ-063). Home only for now; the sitewide block is GAP-05.
 * The button goes to the contact form until /free-audit exists (TODO(STS-034) in content.ts).
 */
const CTASection = () => {
  return (
    <section
      data-home-section="final-cta"
      aria-labelledby="home-final-cta-heading"
      className="py-20 gradient-hero text-primary-foreground"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 id="home-final-cta-heading" className="text-3xl md:text-5xl font-extrabold leading-tight">
            {FINAL_CTA.heading}
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed">{FINAL_CTA.copy}</p>
          <div className="pt-2">
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent text-xl font-bold px-8 h-14 group"
            >
              <Link to={FREE_AUDIT_PATH}>
                {FINAL_CTA.button}
                <ArrowRight aria-hidden="true" className="ml-2 group-hover:translate-x-1 transition-smooth" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
