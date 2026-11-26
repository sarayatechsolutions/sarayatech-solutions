import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PACKAGES, PRICING_PATH } from "./content";

/**
 * Packages teaser (STS-031, REQ-021, REQ-065): 3 package cards plus 1 custom-quote card.
 * No prices until C8 supplies them; the CTA goes to /pricing (STS-033).
 */
const PackagesTeaser = () => {
  const cards = [...PACKAGES.packages, PACKAGES.custom];
  return (
    <section data-home-section="packages" aria-labelledby="home-packages-heading" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 id="home-packages-heading" className="text-3xl md:text-4xl font-bold">
            {PACKAGES.heading}
          </h2>
          <p className="text-lg text-foreground/80">{PACKAGES.intro}</p>
        </div>

        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <li
              key={card.name}
              data-package-card={"price" in card ? "custom" : "package"}
              className="bg-card rounded-2xl p-6 shadow-card border border-border flex flex-col gap-3"
            >
              <h3 className="text-xl font-bold text-foreground">{card.name}</h3>
              <p className="text-foreground/80">
                <span className="font-semibold text-foreground">{PACKAGES.forLabel}</span> {card.for}
              </p>
              <p className="text-foreground/80">
                <span className="font-semibold text-foreground">{PACKAGES.includesLabel}</span> {card.includes}
              </p>
              {"price" in card && <p className="font-semibold text-primary">{card.price}</p>}
            </li>
          ))}
        </ul>

        <div className="text-center mt-12">
          <Button asChild size="lg" className="bg-primary hover:bg-primary-light text-primary-foreground text-lg px-6 sm:px-8 min-h-14 h-auto py-3 whitespace-normal text-center w-full sm:w-auto">
            <Link to={PRICING_PATH}>
              {PACKAGES.cta}
              <ArrowRight aria-hidden="true" className="ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PackagesTeaser;
