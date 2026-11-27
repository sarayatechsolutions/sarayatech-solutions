import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import FinalCta from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import { INDUSTRIES_HUB as H, industryPath, PUBLISHED_INDUSTRIES } from "@/content/industries/industries";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";

/**
 * /industries (STS-042): lists the published industry pages. It is routed only while at least one
 * industry is published (src/routes.tsx), which is also when the /industries lines must leave
 * public/_redirects.
 */
const IndustriesHub = () => (
  <>
    <PageHero id="industries-hub-heading" title={H.h1} intro={H.intro} sectionAttrs={{ "data-local-section": "hero" }} />
    <section data-local-section="list" aria-label={H.h1} className="section bg-background">
      <div className={container}>
        <ul className="grid gap-6 md:grid-cols-2">
          {PUBLISHED_INDUSTRIES.map((e) => (
            <li key={e.slug} className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-3">
              <h2 className="text-xl font-bold text-foreground">{e.name}</h2>
              <p className="text-foreground/80 leading-relaxed">{e.metaDescription}</p>
              <Link
                to={industryPath(e.slug)}
                aria-label={`${H.readLabel}: ${e.name}`}
                className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline"
              >
                {H.readLabel}
                <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
    <FinalCta id="industries" sectionAttrs={{ "data-local-section": "final-cta" }} />
  </>
);

export default IndustriesHub;
