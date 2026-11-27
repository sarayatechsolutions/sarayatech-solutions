import { ExternalLink } from "lucide-react";
import FinalCta from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import { FREE_AUDIT_ACTION } from "@/content/trust/trust";
import { bookingHref } from "@/config/business";
import { HIGH_FETCH_PRIORITY, responsiveImage } from "@/lib/responsiveImage";
import { PROJECT_COPY, WORK_CTA, WORK_HERO, WORK_LABELS } from "@/content/work/work";
import realisationsData from "../../data/realisations.json";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";

interface Realisation {
  company: string;
  industry: string;
  image: string;
  isActive: boolean;
  link: string | null;
}

/** Active projects in data/realisations.json that have reviewed copy, in the data's order. */
export const workProjects = (data: Realisation[] = realisationsData as Realisation[]) =>
  data
    .filter((r) => r.isActive)
    .map((r) => ({ ...r, copy: PROJECT_COPY.find((c) => c.company === r.company) }))
    .filter((r): r is typeof r & { copy: NonNullable<typeof r.copy> } => !!r.copy);

/**
 * Our Work (STS-035, REQ-007, REQ-028, REQ-172). The four verified projects: what each is,
 * what we built, a live link. No metric, quote or result (C10). Text first and no entrance
 * animation, so everything is in the prerendered HTML. Copy: src/content/work/work.ts.
 */
const Realisation = () => {
  const booking = bookingHref();
  const projects = workProjects();

  return (
    <>
      <PageHero
        id="work-heading"
        title={WORK_HERO.headline}
        intro={WORK_HERO.intro}
        sectionAttrs={{ "data-work-section": "hero" }}
      />

      <section data-work-section="projects" aria-label={WORK_LABELS.projectsRegion} className="section bg-surface-subtle">
        <div className={container}>
          <ul className="space-y-10">
            {projects.map((p, i) => (
              <li
                key={p.company}
                data-work-project={p.company}
                className="bg-card rounded-2xl overflow-hidden shadow-card border border-border"
              >
                <div className="grid lg:grid-cols-3 gap-6 p-6 md:p-8 items-start">
                  <img
                    {...responsiveImage(p.image, "(min-width: 1024px) 400px, 100vw")}
                    alt={WORK_LABELS.alt(p.company, p.copy.altLanguage ?? "")}
                    // FF-12: the first screenshot is the page's LCP element, so it is fetched early
                    // and at high priority; the rest stay lazy.
                    {...(i === 0 ? HIGH_FETCH_PRIORITY : { decoding: "async" as const })}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="w-full h-auto rounded-xl border border-border lg:col-span-1"
                  />
                  <div className="lg:col-span-2 space-y-4">
                    <p className="inline-block bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold">
                      {p.industry}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">{p.company}</h2>
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-1">{WORK_LABELS.whatItIs}</h3>
                      <p className="text-foreground/80 leading-relaxed max-w-measure">{p.copy.whatItIs}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-1">{WORK_LABELS.whatWeBuilt}</h3>
                      <p className="text-foreground/80 leading-relaxed max-w-measure">{p.copy.whatWeBuilt}</p>
                    </div>
                    {p.link ? (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline"
                      >
                        {WORK_LABELS.visit(p.company)}
                        <ExternalLink aria-hidden="true" className="w-4 h-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* STS-046: the sitewide closing block (CTA + trust slot), with this page's copy. */}
      <FinalCta
        id="work"
        heading={WORK_CTA.heading}
        copy={WORK_CTA.copy}
        primary={{ label: WORK_CTA.button, href: booking }}
        secondary={FREE_AUDIT_ACTION}
        sectionAttrs={{ "data-work-section": "cta" }}
      />
    </>
  );
};

export default Realisation;
