import { ArrowRight, Check, Globe, Megaphone, Smartphone, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeader from "@/components/SectionHeader";
import { Card } from "@/components/ui/card";
import { STRETCHED_LINK } from "@/components/ui/card-variants";
import { SERVICE_HIGHLIGHTS } from "@/content/services/servicesIndex";
import { SERVICES, type Offering, type Pillar } from "./content";

const ICONS: Record<Pillar["id"], LucideIcon> = {
  websites: Globe,
  apps: Smartphone,
  marketing: Megaphone,
};

/** The 44 px flat icon tile (spec 3.3), replacing the gradient tiles. */
const IconTile = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
    <Icon className="h-[22px] w-[22px]" />
  </span>
);

// Inline, not flex: a label that wraps keeps its arrow after the last word (390 and 768).
const link = `${STRETCHED_LINK} mt-auto block min-h-11 pt-3 font-semibold text-primary underline-offset-4 group-hover:underline focus-visible:underline`;

/**
 * One offering card: the whole card is its link (stretched link), and the link's visible text
 * is the only accessible name (design audit B5, FD-19). `bullets` only on /services.
 */
const OfferingCard = ({
  offering,
  pillar,
  bullets,
}: {
  offering: Offering;
  /** Set on the two large cards, whose pillar has one offering: the pillar heading sits inside. */
  pillar?: Pillar;
  bullets?: readonly string[];
}) => (
  <Card asChild interactive padding={pillar ? "default" : "compact"} className="group h-full gap-2">
    <article aria-labelledby={pillar ? `home-pillar-${pillar.id}` : undefined}>
      {pillar ? (
        <div className="mb-4 flex items-center gap-3">
          <IconTile icon={ICONS[pillar.id]} />
          <h3 id={`home-pillar-${pillar.id}`} className="text-h3 text-foreground">
            {pillar.name}
          </h3>
        </div>
      ) : null}
      <h4 className="text-h4 text-foreground">{offering.title}</h4>
      <p className={pillar ? "text-body-lg text-foreground/80 max-w-measure" : "text-foreground/80 leading-relaxed max-w-measure"}>
        {offering.copy}
      </p>
      {bullets ? (
        <ul className="mt-2 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-foreground/80">
              <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      <Link to={offering.href} className={link}>
        {offering.linkLabel}
        <ArrowRight aria-hidden="true" className="ml-1 inline-block h-4 w-4 align-[-0.125em]" />
      </Link>
    </article>
  </Card>
);

/**
 * Three pillars, five offerings (STS-031, I-1, REQ-054…058, REQ-070), as a bento (design audit
 * B5, FD-19). Mobile first, one column. At md, Websites and Apps sit side by side; at lg they span
 * 3 of 6 columns each and Marketing's three offerings span 2 each, so no card is left mostly
 * empty. Marketing's heading leads its row.
 *
 * `variant="index"` is the /services hub: the same five links, plus three "what's included"
 * points per card from each service page, so the hub is not a copy of the home block.
 */
const ServicePillars = ({ variant = "home" }: { variant?: "home" | "index" }) => {
  const index = variant === "index";
  const [websites, apps, marketing] = SERVICES.pillars;
  const bullets = (o: Offering) => (index ? SERVICE_HIGHLIGHTS[o.href] : undefined);
  const headingId = index ? "services-index-list-heading" : "home-services-heading";
  return (
    <section
      {...(index ? { "data-service-section": "list" } : { "data-home-section": "services" })}
      aria-labelledby={headingId}
      className={`section ${index ? "bg-background" : "bg-surface-subtle"}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader id={headingId} title={SERVICES.heading} />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
          {[websites, apps].map((pillar) => (
            <div key={pillar.id} className="lg:col-span-3">
              <OfferingCard offering={pillar.offerings[0]} pillar={pillar} bullets={bullets(pillar.offerings[0])} />
            </div>
          ))}

          <div role="group" aria-labelledby={`home-pillar-${marketing.id}`} className="md:col-span-2 lg:col-span-6">
            <div className="mb-4 mt-4 flex items-center gap-3 lg:mt-6">
              <IconTile icon={ICONS[marketing.id]} />
              <h3 id={`home-pillar-${marketing.id}`} className="text-h3 text-foreground">
                {marketing.name}
              </h3>
            </div>
            <ul className="grid gap-6 lg:grid-cols-3">
              {marketing.offerings.map((o) => (
                <li key={o.title}>
                  <OfferingCard offering={o} bullets={bullets(o)} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicePillars;
