import type { HTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import type { CtaId } from "@/lib/analytics";

export interface PageHeroCta {
  label: string;
  href: string;
  /** STS-050: fixed analytics id (data-track-cta). Omit for untracked links. */
  cta?: CtaId;
}

type SectionAttrs = HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>;

interface PageHeroProps {
  /** Id of the h1; the section is labelled by it. */
  id: string;
  title: ReactNode;
  /** A breadcrumb <nav>, above the title (blog posts, local pages). */
  breadcrumb?: ReactNode;
  eyebrow?: ReactNode;
  intro?: ReactNode;
  /** The red 56 px CTA (an internal path or the verified booking URL). */
  primaryCta?: PageHeroCta;
  /** The white-outline 56 px CTA. Internal paths only. */
  secondaryCta?: { label: string; href: string };
  /** One small line under the CTAs (the service area). */
  meta?: ReactNode;
  /** Right-hand column at lg (7/5 split). Hidden below lg by the caller. */
  aside?: ReactNode;
  /** "display" on the home page only; every inner page uses "page" (the h1 step). */
  size?: "display" | "page";
  /** Extra copy under the intro (e.g. a second paragraph). */
  children?: ReactNode;
  sectionAttrs?: SectionAttrs;
}

/**
 * The one hero (design audit B4, FD-06). Start-aligned on every page, one background
 * (`gradient-hero`), one rhythm (`pt-32 pb-20`, `lg:pt-36 lg:pb-24`), copy capped at the measure and at
 * most one 56 px CTA pair. No entrance animation: the h1 is in the prerendered first paint.
 *
 * The type-scale classes are written out, not merged with cn(): tailwind-merge cannot tell
 * `text-h1` from a text colour and would drop one of them.
 */
const PageHero = ({
  id,
  title,
  breadcrumb,
  eyebrow,
  intro,
  primaryCta,
  secondaryCta,
  meta,
  aside,
  size = "page",
  children,
  sectionAttrs,
}: PageHeroProps) => {
  const titleClass = size === "display" ? "text-display text-balance" : "text-h1 text-balance";
  const copy = (
    <div className="max-w-3xl space-y-6">
      {breadcrumb}
      {eyebrow ? <p className="text-eyebrow uppercase text-white/90">{eyebrow}</p> : null}
      <h1 id={id} className={titleClass}>
        {title}
      </h1>
      {intro ? <p className="text-body-lg text-white/90 max-w-measure">{intro}</p> : null}
      {children}
      {primaryCta || secondaryCta ? (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-2">
          {/* STS-041: the xl size wraps; the pair goes full width below `sm` (design audit B3). */}
          {primaryCta ? (
            <Button asChild variant="primary" size="xl" className="w-full sm:w-auto" iconEnd={<ArrowRight />}>
              <CtaLink href={primaryCta.href} cta={primaryCta.cta}>
                {primaryCta.label}
              </CtaLink>
            </Button>
          ) : null}
          {secondaryCta ? (
            <Button asChild variant="on-dark" size="xl" className="w-full sm:w-auto">
              <Link to={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      {meta ? <p className="text-small text-white/85">{meta}</p> : null}
    </div>
  );

  return (
    <section
      aria-labelledby={id}
      {...sectionAttrs}
      className="relative overflow-hidden gradient-hero text-primary-foreground"
    >
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 lg:pt-36 lg:pb-24">
        {aside ? (
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">{copy}</div>
            <div className="lg:col-span-5">{aside}</div>
          </div>
        ) : (
          copy
        )}
      </div>
    </section>
  );
};

export default PageHero;
