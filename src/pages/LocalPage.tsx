import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PageHero from "@/components/PageHero";
import FinalCta from "@/components/FinalCta";
import { FREE_AUDIT_PATH } from "@/components/home/content";
import { SERVICE_PAGES, servicePath } from "@/content/services/services";
import { LOCAL_PAGE_LABELS as L, type LocalPageEntry } from "@/content/local/shared";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";
const textLink =
  "inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline";

interface LocalPageProps {
  entry: LocalPageEntry;
  /** Short id used in data attributes and heading ids: "industry" or "area". */
  kind: "industry" | "area";
  /** The breadcrumb between Home and the page, when there is a hub to link to. */
  hub?: { label: string; path: string };
}

/**
 * Template for an industry page (STS-042) and a service-area page (STS-043). Everything on the page
 * is the entry's own owner-supplied text; the only copy added here is navigation labels
 * (content/local/shared.ts). One h1, links to the entry's service pages, a call to action to
 * /free-audit, then the sitewide closing block.
 */
const LocalPage = ({ entry, kind, hub }: LocalPageProps) => {
  const services = entry.services
    .map((slug) => SERVICE_PAGES.find((p) => p.slug === slug))
    .filter((p): p is (typeof SERVICE_PAGES)[number] => Boolean(p));
  const prefix = `${kind}-${entry.slug}`;

  return (
    <>
      <PageHero
        id={`${prefix}-heading`}
        title={entry.h1}
        intro={entry.intro}
        primaryCta={{ label: L.primaryCta, href: FREE_AUDIT_PATH }}
        sectionAttrs={{ "data-local-section": "hero" }}
        breadcrumb={
          <nav aria-label={L.breadcrumbAria}>
            <ol className="flex flex-wrap items-center gap-2 text-sm text-white/90">
              <li>
                <Link to="/" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:underline">
                  {L.homeLabel}
                </Link>
              </li>
              {hub && (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link to={hub.path} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:underline">
                      {hub.label}
                    </Link>
                  </li>
                </>
              )}
            </ol>
          </nav>
        }
      />

      {entry.sections.map((s, i) => (
        <section
          key={s.heading}
          data-local-section="content"
          aria-labelledby={`${prefix}-s${i}`}
          className={`section ${i % 2 === 0 ? "bg-background" : "bg-surface-subtle"}`}
        >
          <div className={`${container} space-y-4`}>
            <h2 id={`${prefix}-s${i}`} className="text-h2 text-foreground">
              {s.heading}
            </h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="text-body-lg text-foreground/80 max-w-measure">
                {p}
              </p>
            ))}
          </div>
        </section>
      ))}

      <nav data-local-section="services" aria-labelledby={`${prefix}-services`} className="section-tight border-t border-border">
        <div className={`${container} space-y-4`}>
          <h2 id={`${prefix}-services`} className="text-h3 text-foreground">
            {L.servicesHeading}
          </h2>
          <p className="text-body-lg text-foreground/80 max-w-measure">{L.servicesIntro}</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {services.map((p) => (
              <li key={p.slug}>
                <Link to={servicePath(p.slug)} className={textLink}>
                  {p.navLabel}
                  <ArrowRight aria-hidden="true" className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <FinalCta id={prefix} sectionAttrs={{ "data-local-section": "final-cta" }} />
    </>
  );
};

export default LocalPage;
