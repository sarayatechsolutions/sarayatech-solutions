import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import { FREE_AUDIT_PATH } from "@/components/home/content";
import { BUSINESS, bookingHref } from "@/config/business";
import {
  PRICING_CTA,
  PRICING_CUSTOM,
  PRICING_HERO,
  PRICING_HOW,
  PRICING_LABELS,
  PRICING_PACKAGES,
  formatPrice,
  type CustomDef,
  type PackageDef,
} from "@/content/pricing/pricing";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";

/**
 * One card. The price slot shows the formatted price when C8 has set one, else the quote
 * wording and never a number. Exported so tests can render both states.
 */
export const PriceCard = ({
  card,
  kind,
  href,
}: {
  card: PackageDef | CustomDef;
  kind: "package" | "custom";
  href: string;
}) => {
  const price = formatPrice(card.priceKind, card.price);
  const fallback = kind === "custom" ? PRICING_LABELS.customQuoteWording : PRICING_LABELS.quoteWording;
  const note = "priceNote" in card ? card.priceNote : undefined;
  return (
    <li
      data-package-card={kind}
      data-price-state={price ? "set" : "quote"}
      className="bg-card rounded-2xl p-6 shadow-card border border-border flex flex-col gap-4"
    >
      <h3 className="text-xl font-bold text-foreground">{card.name}</h3>
      <p className="text-foreground/80">
        <span className="font-semibold text-foreground">{PRICING_PACKAGES.forLabel}</span> {card.for}
      </p>
      <div>
        <p className="font-semibold text-foreground mb-2">{PRICING_PACKAGES.includesLabel}</p>
        <ul className="list-disc pl-5 space-y-1 text-foreground/80">
          {card.inclusions.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
      <p data-price className="text-lg font-bold text-primary mt-auto">
        {price ?? fallback}
      </p>
      {note && <p className="text-sm text-foreground/70 -mt-3">{note}</p>}
      <Button asChild className="bg-primary hover:bg-primary-light text-primary-foreground">
        <CtaLink href={href}>{kind === "custom" ? PRICING_LABELS.customCta : PRICING_LABELS.packageCta}</CtaLink>
      </Button>
    </li>
  );
};

/**
 * Packages & Pricing (STS-033, REQ-027, REQ-065 to REQ-069). Text first and no entrance
 * animation, so every card is in the prerendered HTML. Copy: src/content/pricing/pricing.ts.
 */
const Pricing = () => {
  const booking = bookingHref();
  return (
    <>
      <section
        data-pricing-section="hero"
        aria-labelledby="pricing-heading"
        className="bg-gradient-to-br from-primary via-primary-light to-primary text-white"
      >
        <div className={`${container} pt-28 pb-16 md:pt-36 md:pb-20`}>
          <div className="max-w-3xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-white/90">{BUSINESS.serviceAreaText}</p>
            <h1 id="pricing-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              {PRICING_HERO.headline}
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed">{PRICING_HERO.intro}</p>
            <div className="pt-2">
              <Button asChild size="lg" className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent">
                <CtaLink href={booking}>
                  {PRICING_HERO.cta}
                  <ArrowRight aria-hidden="true" className="w-5 h-5" />
                </CtaLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section data-pricing-section="packages" aria-labelledby="pricing-packages-heading" className="py-20 bg-background">
        <div className={container}>
          <h2 id="pricing-packages-heading" className="text-3xl md:text-4xl font-bold mb-10">
            {PRICING_PACKAGES.heading}
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {PRICING_PACKAGES.packages.map((p) => (
              <PriceCard key={p.id} card={p} kind="package" href={booking} />
            ))}
          </ul>
        </div>
      </section>

      <section data-pricing-section="custom" aria-labelledby="pricing-custom-heading" className="py-20 bg-muted/30">
        <div className={`${container} max-w-3xl`}>
          <h2 id="pricing-custom-heading" className="text-3xl md:text-4xl font-bold mb-10">
            {PRICING_CUSTOM.heading}
          </h2>
          <ul>
            <PriceCard card={PRICING_CUSTOM.card} kind="custom" href={booking} />
          </ul>
        </div>
      </section>

      <section data-pricing-section="how" aria-labelledby="pricing-how-heading" className="py-20 bg-background">
        <div className={`${container} max-w-3xl space-y-4`}>
          <h2 id="pricing-how-heading" className="text-3xl md:text-4xl font-bold">
            {PRICING_HOW.heading}
          </h2>
          <ol className="list-decimal pl-6 space-y-2 text-lg text-foreground/80 leading-relaxed">
            {PRICING_HOW.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </section>

      <section
        data-pricing-section="cta"
        aria-labelledby="pricing-cta-heading"
        className="py-20 gradient-primary text-primary-foreground"
      >
        <div className={`${container} text-center max-w-2xl space-y-6`}>
          <h2 id="pricing-cta-heading" className="text-3xl md:text-4xl font-bold">
            {PRICING_CTA.heading}
          </h2>
          <p className="text-lg text-primary-foreground/90">{PRICING_CTA.copy}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent">
              <CtaLink href={booking}>{PRICING_CTA.button}</CtaLink>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
              <CtaLink href={FREE_AUDIT_PATH}>{PRICING_LABELS.auditCta}</CtaLink>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Pricing;
