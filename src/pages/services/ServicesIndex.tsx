import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import ServicePillars from "@/components/home/ServicePillars";
import FinalCta from "@/components/FinalCta";
import { BUSINESS, bookingHref } from "@/config/business";
import { SERVICES_INDEX as C } from "@/content/services/servicesIndex";

/**
 * The /services hub (STS-039): what SarayaTech sells, one link per service page. It is where the
 * footer's "All Services" link and the header's "Services" entry go, and the redirect target for
 * the retired /solutions and /industries pages (public/_redirects). Text only and no entrance
 * animation, like the service pages, so the whole page is in the prerendered HTML.
 */
const ServicesIndex = () => (
  <>
    <section
      data-service-section="hero"
      aria-labelledby="services-index-heading"
      className="bg-gradient-to-br from-primary via-primary-light to-primary text-white"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/90">{C.eyebrow}</p>
          <h1 id="services-index-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
            {C.h1}
          </h1>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed">{C.intro}</p>
          <div className="pt-2">
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent text-xl font-bold px-8 h-14 group w-full sm:w-auto"
            >
              <CtaLink href={bookingHref()}>
                {C.primaryCta}
                <ArrowRight aria-hidden="true" className="ml-2 group-hover:translate-x-1 transition-smooth" />
              </CtaLink>
            </Button>
          </div>
          <p className="text-sm text-white/85">{BUSINESS.serviceAreaText}</p>
        </div>
      </div>
    </section>
    <ServicePillars />
    <FinalCta id="services-index" sectionAttrs={{ "data-service-section": "final-cta" }} />
  </>
);

export default ServicesIndex;
