import { ArrowRight, Briefcase, ExternalLink, Layers, MapPin, Star, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useInRouterContext, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import { FINAL_CTA, FREE_AUDIT_PATH, HERO } from "@/components/home/content";
import { bookingHref } from "@/config/business";
import type { CtaId } from "@/lib/analytics";
import { FREE_AUDIT_ACTION, TRUST, proofItems, type CtaAction, type ProofIcon, type ProofItem } from "@/content/trust/trust";

/**
 * Sitewide closing block (STS-046, GAP-05; REQ-035 trust, REQ-063 final CTA).
 *
 * Every public page ends with ONE of these:
 *  - <FinalCta>: heading, one line of copy, two actions (the free audit and a consultation via
 *    `bookingHref()`), then the trust slot. Pages pass their own heading/copy/order; the look,
 *    the destinations and the trust slot are shared.
 *  - <TrustSlot standalone>: the trust slot alone, on pages that are themselves the conversion
 *    step (see TRUST_ONLY_PATHS in src/content/trust/trust.ts).
 *
 * Contrast (tokens in src/index.css, measured on the lightest gradient stop, primary-light
 * hsl(220 60% 35%)): white 8.82:1, white/90 7.49:1. The accent button label (white on
 * --accent) is 5.01:1, 6.50:1 on hover and 7.87:1 pressed (darker steps, design audit B1/B3), so it
 * passes as normal text too. No motion beyond a hover nudge, which is motion-safe only.
 */

const ICONS: Record<ProofIcon, LucideIcon> = { star: Star, map: MapPin, work: Briefcase, team: Layers };


const tone = {
  dark: {
    text: "text-white/90",
    heading: "text-white/90",
    link: "text-white focus-visible:ring-white focus-visible:ring-offset-primary",
    rule: "border-white/25",
    icon: "text-white",
  },
  light: {
    text: "text-foreground",
    heading: "text-foreground",
    link: "text-primary focus-visible:ring-ring focus-visible:ring-offset-muted",
    rule: "border-border",
    icon: "text-primary",
  },
} as const;

interface TrustSlotProps {
  /** Unique per page: used for the heading id. */
  id: string;
  /** Override for tests; defaults to the verified items from business config. */
  items?: ProofItem[];
  /** true: its own light section with an h2. false: inside <FinalCta> with an h3. */
  standalone?: boolean;
  /** Items the page already shows elsewhere (one fact, said once per screen). */
  omit?: ProofItem["id"][];
}

/** Reads the router location; only mounted inside a router. */
const CurrentPath = ({ children }: { children: (path: string) => ReactNode }) => <>{children(useLocation().pathname)}</>;

const linkClass =
  "inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/**
 * The verified-proof list. Renders nothing at all when there is no item to show. Works inside or
 * outside a router (a page rendered alone in a unit test has none): outside, internal links are
 * plain anchors.
 */
export const TrustSlot = ({ id, items, standalone = false, omit = [] }: TrustSlotProps) => {
  const inRouter = useInRouterContext();
  const list = (items ?? proofItems()).filter((i) => !omit.includes(i.id));
  if (list.length === 0) return null;
  const t = tone[standalone ? "light" : "dark"];
  const headingId = `${id}-trust-heading`;
  const Heading = standalone ? "h2" : "h3";

  const body = (pathname: string | null) => (
    <div data-trust-slot="" className={standalone ? "" : `mt-12 pt-8 border-t ${t.rule}`}>
      <Heading id={headingId} className={`text-base font-semibold uppercase tracking-wider ${t.heading}`}>
        {TRUST.heading}
      </Heading>
      <ul className="mt-6 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
        {list.map((item) => {
          const Icon = ICONS[item.icon];
          // A link to the page you are on is noise: show the fact without it.
          const link = item.link && item.link.href !== pathname ? item.link : null;
          return (
            <li key={item.id} data-proof-item={item.id} className="flex items-start gap-3">
              <Icon aria-hidden="true" className={`w-5 h-5 mt-0.5 shrink-0 ${t.icon}`} />
              <div className="space-y-1">
                <p className={`text-base leading-relaxed ${t.text}`}>{item.text}</p>
                {!link ? null : link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} ${TRUST.newTab}`}
                    className={`${linkClass} ${t.link}`}
                  >
                    {link.label}
                    <ExternalLink aria-hidden="true" className="w-4 h-4" />
                  </a>
                ) : inRouter ? (
                  <Link to={link.href} className={`${linkClass} ${t.link}`}>
                    {link.label}
                  </Link>
                ) : (
                  <a href={link.href} className={`${linkClass} ${t.link}`}>
                    {link.label}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const content = inRouter ? <CurrentPath>{body}</CurrentPath> : body(null);
  if (!standalone) return content;
  return (
    <section data-final-cta="trust-only" aria-labelledby={headingId} className="py-16 bg-muted">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">{content}</div>
    </section>
  );
};

interface FinalCtaProps {
  /** Unique per page: prefix for the heading ids (aria-labelledby). */
  id: string;
  heading?: string;
  copy?: string;
  /** Filled accent button. Default: "Get My Free Audit" -> /free-audit (REQ-063). */
  primary?: CtaAction;
  /** On-dark button. Default: CONSULTATION_CTA_LABEL ("Request a Free Consultation" while booking is
   *  unverified) -> bookingHref(). */
  secondary?: CtaAction;
  /** Page section marker kept from the page's old CTA, e.g. { "data-about-section": "cta" }. */
  sectionAttrs?: Record<`data-${string}`, string>;
  /** Override for tests; defaults to the verified items from business config. */
  items?: ProofItem[];
}

/** STS-050: pages swap the two actions, so the event id follows the destination, not the slot. */
const ctaIdFor = (href: string): CtaId => (href === FREE_AUDIT_PATH ? "final_audit" : "final_consultation");

const FinalCta = ({ id, heading, copy, primary, secondary, sectionAttrs, items }: FinalCtaProps) => {
  const headingId = `${id}-final-cta-heading`;
  const main = primary ?? FREE_AUDIT_ACTION;
  const second = secondary ?? { label: HERO.primaryCta, href: bookingHref() };
  return (
    <section
      {...sectionAttrs}
      data-final-cta="full"
      aria-labelledby={headingId}
      className="py-20 gradient-hero text-primary-foreground"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 id={headingId} className="text-3xl md:text-5xl font-extrabold leading-tight">
            {heading ?? FINAL_CTA.heading}
          </h2>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed">{copy ?? FINAL_CTA.copy}</p>
          {/* Design audit B3: xl buttons wrap instead of overflowing at 320 px and are 56 px tall;
              the pair stacks full width below `sm`, primary first, 12 px apart. */}
          <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
            <Button asChild variant="primary" size="xl" className="w-full sm:w-auto" iconEnd={<ArrowRight />}>
              <CtaLink href={main.href} cta={ctaIdFor(main.href)}>
                {main.label}
              </CtaLink>
            </Button>
            <Button asChild variant="on-dark" size="xl" className="w-full sm:w-auto">
              <CtaLink href={second.href} cta={ctaIdFor(second.href)}>{second.label}</CtaLink>
            </Button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto">
          <TrustSlot id={id} items={items} />
        </div>
      </div>
    </section>
  );
};

export default FinalCta;
