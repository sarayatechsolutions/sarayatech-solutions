import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CtaLink from "@/components/home/CtaLink";
import FinalCta from "@/components/FinalCta";
import { FREE_AUDIT_ACTION } from "@/content/trust/trust";
import { BUSINESS, bookingHref } from "@/config/business";
import { responsiveImage } from "@/lib/responsiveImage";
import {
  ABOUT_CTA,
  ABOUT_HERO,
  ABOUT_TEAM,
  ABOUT_VALUES,
  ABOUT_WHO,
  FOUNDER,
  initials,
  type FounderStory,
  type TeamMember,
} from "@/content/about/about";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";

/**
 * Founder photo and story (REQ-030, REQ-062). Rendered only once the owner supplies C7: while
 * `FOUNDER` is null this returns nothing, so no placeholder or invented copy reaches the page.
 */
export const FounderSection = ({ founder }: { founder: FounderStory | null }) => {
  if (!founder) return null;
  return (
    <section data-about-section="founder" aria-labelledby="about-founder-heading" className="py-20 bg-background">
      <div className={`${container} grid gap-10 md:grid-cols-[auto,1fr] items-start max-w-5xl`}>
        {founder.photo && (
          <img
            {...responsiveImage(founder.photo, "224px")}
            alt={ABOUT_TEAM.photoAlt(founder.name)}
            loading="lazy"
            decoding="async"
            className="w-56 h-56 rounded-2xl object-cover"
          />
        )}
        <div className="space-y-4">
          <h2 id="about-founder-heading" className="text-3xl md:text-4xl font-bold">
            {founder.heading}
          </h2>
          <p className="font-semibold text-primary">
            {founder.name}, {founder.role}
          </p>
          {founder.paragraphs.map((p) => (
            <p key={p} className="text-lg text-foreground/80 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
};

const MemberCard = ({ member }: { member: TeamMember }) => (
  <li className="bg-card rounded-2xl p-6 shadow-card border border-border flex flex-col items-center text-center">
    {member.photo ? (
      <img
        {...responsiveImage(member.photo, "160px")}
        alt={ABOUT_TEAM.photoAlt(member.name)}
        loading="lazy"
        decoding="async"
        className="w-40 h-40 rounded-full object-cover mb-5 border-4 border-white shadow-lg"
      />
    ) : (
      // No portrait in the repo: initials, hidden from assistive tech (the name follows as text).
      <div
        aria-hidden="true"
        data-initials-avatar
        className="w-40 h-40 rounded-full mb-5 flex items-center justify-center bg-primary text-primary-foreground text-4xl font-bold border-4 border-white shadow-lg"
      >
        {initials(member.name)}
      </div>
    )}
    <h3 className="text-xl font-bold text-foreground">{member.name}</h3>
    <p className="text-sm font-semibold text-primary mb-3">{member.role}</p>
    <p className="text-sm text-foreground/80 leading-relaxed">{member.bio}</p>
  </li>
);

/**
 * About page (STS-036, REQ-030, REQ-062, REQ-015, REQ-178). Text first and no entrance
 * animation, so every section is in the prerendered HTML. Copy: src/content/about/about.ts.
 */
const About = () => {
  const booking = bookingHref();

  return (
    <>
      <section
        data-about-section="hero"
        aria-labelledby="about-heading"
        className="bg-gradient-to-br from-primary via-primary-light to-primary text-white"
      >
        <div className={`${container} pt-28 pb-16 md:pt-36 md:pb-20`}>
          <div className="max-w-3xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-white/90">{BUSINESS.serviceAreaText}</p>
            <h1 id="about-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              {ABOUT_HERO.headline}
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed">{ABOUT_HERO.intro}</p>
            <div className="pt-2">
              <Button asChild size="lg" className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent">
                <CtaLink href={booking}>
                  {ABOUT_HERO.cta}
                  <ArrowRight aria-hidden="true" className="w-5 h-5" />
                </CtaLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section data-about-section="who" aria-labelledby="about-who-heading" className="py-20 bg-background">
        <div className={`${container} max-w-3xl space-y-4`}>
          <h2 id="about-who-heading" className="text-3xl md:text-4xl font-bold">
            {ABOUT_WHO.heading}
          </h2>
          {ABOUT_WHO.paragraphs.map((p) => (
            <p key={p} className="text-lg text-foreground/80 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </section>

      <FounderSection founder={FOUNDER} />

      <section data-about-section="values" aria-labelledby="about-values-heading" className="py-20 bg-muted/30">
        <div className={container}>
          <h2 id="about-values-heading" className="text-3xl md:text-4xl font-bold mb-10">
            {ABOUT_VALUES.heading}
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {ABOUT_VALUES.items.map((v) => (
              <li key={v.title} className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-2">
                <h3 className="text-xl font-bold text-foreground">{v.title}</h3>
                <p className="text-foreground/80 leading-relaxed">{v.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-about-section="team" aria-labelledby="about-team-heading" className="py-20 bg-background">
        <div className={container}>
          <div className="max-w-3xl mb-10 space-y-3">
            <h2 id="about-team-heading" className="text-3xl md:text-4xl font-bold">
              {ABOUT_TEAM.heading}
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed">{ABOUT_TEAM.intro}</p>
          </div>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT_TEAM.members.map((m) => (
              <MemberCard key={m.name} member={m} />
            ))}
          </ul>
        </div>
      </section>

      {/* STS-046: the sitewide closing block (CTA + trust slot), with this page's copy. */}
      <FinalCta
        id="about"
        heading={ABOUT_CTA.heading}
        copy={ABOUT_CTA.copy}
        primary={{ label: ABOUT_CTA.button, href: booking }}
        secondary={FREE_AUDIT_ACTION}
        sectionAttrs={{ "data-about-section": "cta" }}
      />
    </>
  );
};

export default About;
