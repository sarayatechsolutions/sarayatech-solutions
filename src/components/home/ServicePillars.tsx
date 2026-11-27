import { ArrowRight, Globe, Megaphone, Smartphone, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeader from "@/components/SectionHeader";
import { SERVICES, type Pillar } from "./content";

const ICONS: Record<Pillar["id"], LucideIcon> = {
  websites: Globe,
  apps: Smartphone,
  marketing: Megaphone,
};

/** Three pillars, five offerings (STS-031, I-1, REQ-054…058, REQ-070). */
const ServicePillars = () => (
  <section data-home-section="services" aria-labelledby="home-services-heading" className="section bg-surface-subtle">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeader id="home-services-heading" title={SERVICES.heading} />

      <div className="grid gap-8 lg:grid-cols-3">
        {SERVICES.pillars.map((pillar) => {
          const Icon = ICONS[pillar.id];
          return (
            <article
              key={pillar.id}
              aria-labelledby={`home-pillar-${pillar.id}`}
              className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <Icon aria-hidden="true" className="w-6 h-6 text-primary-foreground" />
                </span>
                <h3 id={`home-pillar-${pillar.id}`} className="text-2xl font-bold text-foreground">
                  {pillar.name}
                </h3>
              </div>

              <ul className="space-y-6">
                {pillar.offerings.map((offering) => (
                  <li key={offering.title} className="space-y-2">
                    <h4 className="text-lg font-semibold text-foreground">{offering.title}</h4>
                    <p className="text-foreground/80 leading-relaxed">{offering.copy}</p>
                    <Link
                      to={offering.href}
                      className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline"
                    >
                      {offering.linkLabel}
                      <ArrowRight aria-hidden="true" className="w-4 h-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);

export default ServicePillars;
