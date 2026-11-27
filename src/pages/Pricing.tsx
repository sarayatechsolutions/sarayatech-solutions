import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import FinalCta from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import { FREE_AUDIT_PATH, HERO, PROOF_PATH } from "@/components/home/content";
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
      <Button asChild variant="secondary" size="lg">
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
      <PageHero
        id="pricing-heading"
        eyebrow={BUSINESS.serviceAreaText}
        title={PRICING_HERO.headline}
        intro={PRICING_HERO.intro}
        primaryCta={{ label: PRICING_HERO.cta, href: booking }}
        secondaryCta={{ label: HERO.secondaryCta, href: PROOF_PATH }}
        sectionAttrs={{ "data-pricing-section": "hero" }}
      />

      <section data-pricing-section="packages" aria-labelledby="pricing-packages-heading" className="section bg-background">
        <div className={container}>
          <SectionHeader id="pricing-packages-heading" title={PRICING_PACKAGES.heading} />
          <ul className="grid gap-6 md:grid-cols-3">
            {PRICING_PACKAGES.packages.map((p) => (
              <PriceCard key={p.id} card={p} kind="package" href={booking} />
            ))}
          </ul>
        </div>
      </section>

      <section data-pricing-section="custom" aria-labelledby="pricing-custom-heading" className="section bg-surface-subtle">
        <div className={container}>
          <SectionHeader id="pricing-custom-heading" title={PRICING_CUSTOM.heading} />
          <ul className="max-w-3xl">
            <PriceCard card={PRICING_CUSTOM.card} kind="custom" href={booking} />
          </ul>
        </div>
      </section>

      <section data-pricing-section="how" aria-labelledby="pricing-how-heading" className="section bg-background">
        <div className={container}>
          <SectionHeader id="pricing-how-heading" title={PRICING_HOW.heading} />
          <ol className="list-decimal pl-6 space-y-2 text-body-lg text-foreground/80 max-w-measure">
            {PRICING_HOW.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </section>

      {/* STS-046: the sitewide closing block (CTA + trust slot), with this page's copy. */}
      <FinalCta
        id="pricing"
        heading={PRICING_CTA.heading}
        copy={PRICING_CTA.copy}
        primary={{ label: PRICING_CTA.button, href: booking }}
        secondary={{ label: PRICING_LABELS.auditCta, href: FREE_AUDIT_PATH }}
        sectionAttrs={{ "data-pricing-section": "cta" }}
      />
    </>
  );
};

export default Pricing;
