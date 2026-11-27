import { TrustSlot } from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import { BUSINESS } from "@/config/business";
import { CAREERS, CAREERS_CONTACT_PATH } from "@/content/careers/careers";

/**
 * Careers (FD-01, design audit batch B0): the owner's fallback while no role is confirmed
 * (C20/C27 OPEN). No role, salary or perk is shown, the page is noindex and out of the sitemap
 * (src/seo/seo.ts), and the one call to action is a link to the contact form. Text only and no
 * entrance animation, like the other inner pages, so the whole page is in the prerendered HTML.
 * Copy: src/content/careers/careers.ts.
 */
const Careers = () => (
  <>
    {/* One link styled as a button, never a <button> nested inside an <a> (STS-056). */}
    <PageHero
      id="careers-heading"
      eyebrow={BUSINESS.serviceAreaText}
      title={CAREERS.headline}
      intro={CAREERS.body}
      primaryCta={{ label: CAREERS.cta, href: CAREERS_CONTACT_PATH }}
      sectionAttrs={{ "data-careers-section": "hero" }}
    />
    {/* STS-046: sitewide trust slot; the contact link above stays the page's only call to action. */}
    <TrustSlot id="careers" standalone />
  </>
);

export default Careers;
