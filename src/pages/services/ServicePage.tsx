import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { BUSINESS, bookingHref } from "@/config/business";
import { HERO, PROOF_PATH } from "@/components/home/content";
import FinalCta from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import {
  SERVICE_PAGES,
  SERVICE_PAGE_LABELS as L,
  serviceProjects,
  servicePath,
  type ServicePageContent,
  type ServiceSection,
} from "@/content/services/services";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";
const textLink =
  "inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline";

const SectionBody = ({ section }: { section: ServiceSection }) => {
  switch (section.kind) {
    case "list":
      return (
        <>
          {section.intro && <p className="text-body-lg text-foreground/80 max-w-measure mb-6">{section.intro}</p>}
          <ul className="grid gap-6 md:grid-cols-2">
            {section.items.map((item) => (
              <li key={item.title} className="flex gap-3">
                <Check aria-hidden="true" className="w-6 h-6 mt-0.5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-foreground/80 leading-relaxed max-w-measure">{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      );
    case "steps":
      return (
        <>
          {section.intro && <p className="text-body-lg text-foreground/80 max-w-measure mb-6">{section.intro}</p>}
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {section.items.map((item, i) => (
              <li key={item.title} className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-2">
                <span aria-hidden="true" className="block text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-foreground/80 leading-relaxed max-w-measure">{item.copy}</p>
              </li>
            ))}
          </ol>
        </>
      );
    case "text":
      return (
        <div className="space-y-4 max-w-measure">
          {section.paragraphs.map((p) => (
            <p key={p} className="text-body-lg text-foreground/80">
              {p}
            </p>
          ))}
        </div>
      );
    case "projects": {
      const projects = serviceProjects(section.projects);
      return (
        <>
          <p className="text-body-lg text-foreground/80 max-w-measure mb-6">{section.intro}</p>
          {projects.length > 0 && (
            <ul className="grid gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <li key={project.company} className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-2">
                  <p className="text-sm font-semibold text-primary">{project.industry}</p>
                  <h3 className="text-xl font-bold text-foreground">{project.company}</h3>
                  <p className="text-foreground/80 leading-relaxed max-w-measure">{project.summary}</p>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${L.visitLabel(project.company)} ${L.opensInNewTab}`}
                    className={textLink}
                  >
                    {L.visitLabel(project.company)}
                    <ExternalLink aria-hidden="true" className="w-4 h-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6">
            <Link to={PROOF_PATH} className={textLink}>
              {L.proofCta}
              <ArrowRight aria-hidden="true" className="w-4 h-4" />
            </Link>
          </p>
        </>
      );
    }
    case "faq":
      return (
        // Every answer is in the HTML and visible: no accordion hides it from no-JS readers.
        <div className="space-y-6 max-w-measure">
          {section.items.map((item) => (
            <div key={item.question} className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">{item.question}</h3>
              <p className="text-foreground/80 leading-relaxed max-w-measure">{item.answer}</p>
            </div>
          ))}
        </div>
      );
  }
};

/**
 * One service page (STS-032, REQ-006, REQ-022…026). Text only and no entrance animation, so the
 * whole page is in the prerendered HTML and the first paint. Copy comes from
 * src/content/services/services.ts; the booking CTA from the business config (C15 fallback: the
 * contact form); the final CTA reuses the home page's (REQ-063).
 */
const ServicePage = ({ page }: { page: ServicePageContent }) => {
  const others = SERVICE_PAGES.filter((p) => p.slug !== page.slug);
  const headingId = `service-${page.slug}-heading`;

  return (
    <>
      <PageHero
        id={headingId}
        eyebrow={page.eyebrow}
        title={page.h1}
        intro={page.intro}
        primaryCta={{ label: L.primaryCta, href: bookingHref() }}
        secondaryCta={{ label: HERO.secondaryCta, href: PROOF_PATH }}
        meta={BUSINESS.serviceAreaText}
        sectionAttrs={{ "data-service-section": "hero" }}
      />

      {page.sections.map((section, i) => (
        <section
          key={section.id}
          data-service-section={section.id}
          aria-labelledby={`service-${page.slug}-${section.id}`}
          className={`section ${i % 2 === 0 ? "bg-background" : "bg-surface-subtle"}`}
        >
          <div className={container}>
            <SectionHeader id={`service-${page.slug}-${section.id}`} title={section.heading} />
            <SectionBody section={section} />
          </div>
        </section>
      ))}

      <nav
        data-service-section="other-services"
        aria-labelledby={`service-${page.slug}-others`}
        className="section-tight border-t border-border"
      >
        <div className={container}>
          <h2 id={`service-${page.slug}-others`} className="text-h3 text-foreground mb-6">
            {L.otherServicesHeading}
          </h2>
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {others.map((p) => (
              <li key={p.slug}>
                <Link to={servicePath(p.slug)} className={`${textLink} min-h-11`}>
                  {p.navLabel}
                  <ArrowRight aria-hidden="true" className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* STS-046: the sitewide closing block (free audit, consultation, trust slot). */}
      <FinalCta id={`service-${page.slug}`} sectionAttrs={{ "data-service-section": "final-cta" }} />
    </>
  );
};

export default ServicePage;
