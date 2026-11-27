import PageHero from "@/components/PageHero";
import { BUSINESS, bookingHref } from "@/config/business";
import HeroFrames from "./HeroFrames";
import { HERO, PROOF_PATH } from "./content";

/**
 * Homepage hero (STS-031, REQ-050/051; design audit B4, FD-05). The shared PageHero at display
 * size, with real project frames in the right column at lg and up (hidden, and not downloaded,
 * below lg). No entrance animation on the copy, so the headline is in the first paint.
 *
 * Trust line: the service area from the business config (C4/C5 fallback). The Google rating
 * from the source trust line is not shown until C14 supplies a real rating and count (REQ-052).
 */
const HeroSection = () => (
  <PageHero
    id="home-hero-heading"
    size="display"
    title={HERO.headline}
    intro={HERO.subheadline}
    primaryCta={{ label: HERO.primaryCta, href: bookingHref(), cta: "hero_consultation" }}
    secondaryCta={{ label: HERO.secondaryCta, href: PROOF_PATH }}
    meta={BUSINESS.serviceAreaText}
    aside={<HeroFrames />}
    sectionAttrs={{ "data-home-section": "hero" }}
  />
);

export default HeroSection;
