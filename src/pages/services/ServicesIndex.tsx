import PageHero from "@/components/PageHero";
import { HERO, PROOF_PATH } from "@/components/home/content";
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
    <PageHero
      id="services-index-heading"
      eyebrow={C.eyebrow}
      title={C.h1}
      intro={C.intro}
      primaryCta={{ label: C.primaryCta, href: bookingHref() }}
      secondaryCta={{ label: HERO.secondaryCta, href: PROOF_PATH }}
      meta={BUSINESS.serviceAreaText}
      sectionAttrs={{ "data-service-section": "hero" }}
    />
    <ServicePillars variant="index" />
    <FinalCta id="services-index" sectionAttrs={{ "data-service-section": "final-cta" }} />
  </>
);

export default ServicesIndex;
