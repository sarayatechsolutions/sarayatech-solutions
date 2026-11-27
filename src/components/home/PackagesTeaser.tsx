import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/SectionHeader";
import { PACKAGES, PRICING_PATH } from "./content";

/**
 * Packages teaser (STS-031, REQ-021, REQ-065): 3 package cards plus 1 custom-quote card.
 * No prices until C8 supplies them; the CTA goes to /pricing (STS-033).
 */
const PackagesTeaser = () => {
  const cards = [...PACKAGES.packages, PACKAGES.custom];
  return (
    <section data-home-section="packages" aria-labelledby="home-packages-heading" className="section bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader id="home-packages-heading" title={PACKAGES.heading} lead={PACKAGES.intro} />

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

        <div className="mt-10">
          <Button asChild variant="secondary" size="xl" className="w-full sm:w-auto" iconEnd={<ArrowRight />}>
            <Link to={PRICING_PATH}>{PACKAGES.cta}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PackagesTeaser;
