import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import { BUSINESS, bookingHref } from "@/config/business";
import { FINAL_CTA, FREE_AUDIT_PATH, PROOF_PATH } from "@/components/home/content";
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
          {section.intro && <p className="text-lg text-foreground/80 mb-6">{section.intro}</p>}
          <ul className="grid gap-6 md:grid-cols-2">
            {section.items.map((item) => (
              <li key={item.title} className="flex gap-3">
                <Check aria-hidden="true" className="w-6 h-6 mt-0.5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-foreground/80 leading-relaxed">{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      );
    case "steps":
      return (
        <>
          {section.intro && <p className="text-lg text-foreground/80 mb-6">{section.intro}</p>}
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {section.items.map((item, i) => (
              <li key={item.title} className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-2">
                <span aria-hidden="true" className="block text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-foreground/80 leading-relaxed">{item.copy}</p>
              </li>
            ))}
          </ol>
        </>
      );
    case "text":
      return (
        <div className="space-y-4 max-w-3xl">
          {section.paragraphs.map((p) => (
            <p key={p} className="text-lg text-foreground/80 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      );
    case "projects": {
      const projects = serviceProjects(section.projects);
      return (
        <>
          <p className="text-lg text-foreground/80 mb-6">{section.intro}</p>
          {projects.length > 0 && (
            <ul className="grid gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <li key={project.company} className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-2">
                  <p className="text-sm font-semibold text-primary">{project.industry}</p>
                  <h3 className="text-xl font-bold text-foreground">{project.company}</h3>
                  <p className="text-foreground/80 leading-relaxed">{project.summary}</p>
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
        <div className="space-y-6 max-w-3xl">
          {section.items.map((item) => (
            <div key={item.question} className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">{item.question}</h3>
              <p className="text-foreground/80 leading-relaxed">{item.answer}</p>
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
      <section
        data-service-section="hero"
        aria-labelledby={headingId}
        className="bg-gradient-to-br from-primary via-primary-light to-primary text-white"
      >
        <div className={`${container} pt-28 pb-16 md:pt-36 md:pb-20`}>
          <div className="max-w-3xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-white/90">{page.eyebrow}</p>
            <h1 id={headingId} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              {page.h1}
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed">{page.intro}</p>
            <div className="pt-2">
              <Button
                asChild
                size="lg"
                className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent text-xl font-bold px-8 h-14 group w-full sm:w-auto"
              >
                <CtaLink href={bookingHref()}>
                  {L.primaryCta}
                  <ArrowRight aria-hidden="true" className="ml-2 group-hover:translate-x-1 transition-smooth" />
                </CtaLink>
              </Button>
            </div>
            <p className="text-sm text-white/85">{BUSINESS.serviceAreaText}</p>
          </div>
        </div>
      </section>

      {page.sections.map((section, i) => (
        <section
          key={section.id}
          data-service-section={section.id}
          aria-labelledby={`service-${page.slug}-${section.id}`}
          className={`py-16 ${i % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
        >
          <div className={container}>
            <h2 id={`service-${page.slug}-${section.id}`} className="text-3xl md:text-4xl font-bold mb-8">
              {section.heading}
            </h2>
            <SectionBody section={section} />
          </div>
        </section>
      ))}

      <nav
        data-service-section="other-services"
        aria-labelledby={`service-${page.slug}-others`}
        className="py-16 border-t border-border"
      >
        <div className={container}>
          <h2 id={`service-${page.slug}-others`} className="text-2xl md:text-3xl font-bold mb-6">
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

      <section
        data-service-section="final-cta"
        aria-labelledby={`service-${page.slug}-final-cta`}
        className="py-20 gradient-hero text-primary-foreground"
      >
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 id={`service-${page.slug}-final-cta`} className="text-3xl md:text-5xl font-extrabold leading-tight">
              {FINAL_CTA.heading}
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed">{FINAL_CTA.copy}</p>
            <div className="pt-2">
              <Button
                asChild
                size="lg"
                className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent text-xl font-bold px-8 h-14 group"
              >
                <Link to={FREE_AUDIT_PATH}>
                  {FINAL_CTA.button}
                  <ArrowRight aria-hidden="true" className="ml-2 group-hover:translate-x-1 transition-smooth" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ServicePage;
