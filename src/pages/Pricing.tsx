import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Steps from "@/components/Steps";
import CtaLink from "@/components/home/CtaLink";
import FinalCta from "@/components/FinalCta";
import { contactHrefFor } from "@/content/forms/contact-context";
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
  emphasis = false,
}: {
  card: PackageDef | CustomDef;
  kind: "package" | "custom";
  href: string;
  /** The last package's button is filled navy (FD-25). No badge: "Most chosen" waits for the owner. */
  emphasis?: boolean;
}) => {
  const price = formatPrice(card.priceKind, card.price);
  const fallback = kind === "custom" ? PRICING_LABELS.customQuoteWording : PRICING_LABELS.quoteWording;
  const note = "priceNote" in card ? card.priceNote : undefined;
  return (
    <Card asChild className="h-full gap-4">
      <li data-package-card={kind} data-price-state={price ? "set" : "quote"}>
        <h3 className="text-h4 text-foreground">{card.name}</h3>
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
        <p data-price className="text-lg font-bold text-primary mt-auto pt-2">
          {price ?? fallback}
        </p>
        {note && <p className="text-sm text-foreground/70 -mt-3">{note}</p>}
        {/* One CTA, outline, 44 px and 16 px (FD-25); the label names the package. */}
        <Button asChild variant={emphasis ? "secondary" : "outline"} size="lg" className="w-full whitespace-normal text-center">
          <CtaLink href={href}>{kind === "custom" ? PRICING_LABELS.customCta : PRICING_LABELS.packageCta(card.name)}</CtaLink>
        </Button>
      </li>
    </Card>
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
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRICING_PACKAGES.packages.map((p, i, all) => (
              <PriceCard
                key={p.id}
                card={p}
                kind="package"
                // FF-10: the contact form opens with this package named (unverified booking only).
                href={contactHrefFor({ package: p.id }, booking)}
                emphasis={i === all.length - 1}
              />
            ))}
          </ul>
        </div>
      </section>

      <section data-pricing-section="custom" aria-labelledby="pricing-custom-heading" className="section bg-surface-subtle">
        <div className={container}>
          <SectionHeader id="pricing-custom-heading" title={PRICING_CUSTOM.heading} />
          <ul className="max-w-3xl">
            <PriceCard card={PRICING_CUSTOM.card} kind="custom" href={contactHrefFor({ package: PRICING_CUSTOM.card.id }, booking)} />
          </ul>
        </div>
      </section>

      <section data-pricing-section="how" aria-labelledby="pricing-how-heading" className="section bg-background">
        <div className={container}>
          <SectionHeader id="pricing-how-heading" title={PRICING_HOW.heading} />
          <Steps items={PRICING_HOW.steps.map((copy) => ({ copy }))} />
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
