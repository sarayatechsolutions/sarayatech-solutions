import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import { bookingHref } from "@/config/business";
import { INSIGHTS_CTA, INSIGHTS_HERO, INSIGHTS_TOPICS } from "@/content/insights/insights";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";

/**
 * STS-040. No article is published yet, so this page shows no article card, category, date or
 * "Read Article" button (REQ-018, REQ-031). It is noindex until the first article (seo.ts).
 */
const Insights = () => {
  const booking = bookingHref();
  return (
    <>
      <section data-insights-section="hero" className="pt-32 pb-16 gradient-primary text-primary-foreground">
        <div className={`${container} max-w-3xl space-y-6`}>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">{INSIGHTS_HERO.headline}</h1>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed">{INSIGHTS_HERO.intro}</p>
        </div>
      </section>

      <section data-insights-section="topics" aria-labelledby="insights-topics-heading" className="py-20 bg-background">
        <div className={`${container} max-w-3xl space-y-6`}>
          <h2 id="insights-topics-heading" className="text-3xl md:text-4xl font-bold">
            {INSIGHTS_TOPICS.heading}
          </h2>
          <p className="text-lg text-foreground/80 leading-relaxed">{INSIGHTS_TOPICS.intro}</p>
          <ul className="list-disc pl-6 space-y-3 text-lg text-foreground/80">
            {INSIGHTS_TOPICS.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section
        data-insights-section="cta"
        aria-labelledby="insights-cta-heading"
        className="py-20 gradient-primary text-primary-foreground"
      >
        <div className={`${container} text-center max-w-2xl space-y-6`}>
          <h2 id="insights-cta-heading" className="text-3xl md:text-4xl font-bold">
            {INSIGHTS_CTA.heading}
          </h2>
          <p className="text-lg text-primary-foreground/90">{INSIGHTS_CTA.copy}</p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent">
            <CtaLink href={booking}>
              {INSIGHTS_CTA.button}
              <ArrowRight aria-hidden="true" className="w-5 h-5" />
            </CtaLink>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Insights;
