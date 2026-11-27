import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BUSINESS, bookingHref } from "@/config/business";
import CtaLink from "./CtaLink";
import { HERO, PROOF_PATH } from "./content";

/**
 * Homepage hero (STS-031, REQ-050/051). Text only: the generic tech background and the
 * generated dashboard mockup are no longer rendered (source "What to remove"; the image files
 * are kept in src/assets). No entrance animation, so the headline is in the first paint.
 *
 * Trust line: the service area from the business config (C4/C5 fallback). The Google rating
 * from the source trust line is not shown until C14 supplies a real rating and count (REQ-052).
 */
const HeroSection = () => {
  return (
    <section
      data-home-section="hero"
      aria-labelledby="home-hero-heading"
      className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary text-white"
    >
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="max-w-3xl space-y-6">
          <h1
            id="home-hero-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight"
          >
            {HERO.headline}
          </h1>

          <p className="text-lg md:text-xl text-white/90 leading-relaxed">{HERO.subheadline}</p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button
              asChild
              size="lg"
              // STS-041: at 320 px the nowrap 20 px label measured 333 px in a 288 px column (page scrolled
              // sideways). Full width and wrapping below `sm`, unchanged from `sm` up.
              className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent text-lg sm:text-xl font-bold px-6 sm:px-8 min-h-14 h-auto py-3 whitespace-normal text-center w-full sm:w-auto group"
            >
              <CtaLink href={bookingHref()} cta="hero_consultation">
                {HERO.primaryCta}
                <ArrowRight aria-hidden="true" className="ml-2 motion-safe:group-hover:translate-x-0.5 transition-transform duration-fast ease-standard" />
              </CtaLink>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/40 text-lg sm:text-xl font-bold px-6 sm:px-8 min-h-14 h-auto py-3 whitespace-normal text-center w-full sm:w-auto"
            >
              <Link to={PROOF_PATH}>{HERO.secondaryCta}</Link>
            </Button>
          </div>

          <p className="text-sm text-white/85">{BUSINESS.serviceAreaText}</p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
