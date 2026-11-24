import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import { bookingHref } from "@/config/business";
import { responsiveImage } from "@/lib/responsiveImage";
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
      <section data-work-section="hero" aria-labelledby="work-heading" className="gradient-primary text-primary-foreground">
        <div className={`${container} pt-28 pb-16 md:pt-36 md:pb-20`}>
          <div className="max-w-3xl space-y-6">
            <h1 id="work-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              {WORK_HERO.headline}
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed">{WORK_HERO.intro}</p>
          </div>
        </div>
      </section>

      <section data-work-section="projects" aria-label={WORK_HERO.headline} className="py-20 bg-muted/30">
        <div className={container}>
          <ul className="space-y-10">
            {projects.map((p) => (
              <li
                key={p.company}
                data-work-project={p.company}
                className="bg-card rounded-2xl overflow-hidden shadow-card border border-border"
              >
                <div className="grid lg:grid-cols-3 gap-6 p-6 md:p-8 items-start">
                  <img
                    {...responsiveImage(p.image, "(min-width: 1024px) 400px, 100vw")}
                    alt={WORK_LABELS.alt(p.company, p.copy.altLanguage ?? "")}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto rounded-xl border border-border lg:col-span-1"
                  />
                  <div className="lg:col-span-2 space-y-4">
                    <p className="inline-block bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold">
                      {p.industry}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">{p.company}</h2>
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-1">{WORK_LABELS.whatItIs}</h3>
                      <p className="text-foreground/80 leading-relaxed">{p.copy.whatItIs}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-1">{WORK_LABELS.whatWeBuilt}</h3>
                      <p className="text-foreground/80 leading-relaxed">{p.copy.whatWeBuilt}</p>
                    </div>
                    {p.link ? (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
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

      <section data-work-section="cta" aria-labelledby="work-cta-heading" className="py-20 gradient-primary text-primary-foreground">
        <div className={`${container} text-center max-w-2xl space-y-6`}>
          <h2 id="work-cta-heading" className="text-3xl md:text-4xl font-bold">
            {WORK_CTA.heading}
          </h2>
          <p className="text-lg text-primary-foreground/90">{WORK_CTA.copy}</p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent">
            <CtaLink href={booking}>{WORK_CTA.button}</CtaLink>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Realisation;
