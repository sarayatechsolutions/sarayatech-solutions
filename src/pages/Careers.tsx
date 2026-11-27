import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustSlot } from "@/components/FinalCta";
import { BUSINESS } from "@/config/business";
import { CAREERS, CAREERS_CONTACT_PATH } from "@/content/careers/careers";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";

/**
 * Careers (FD-01, design audit batch B0): the owner's fallback while no role is confirmed
 * (C20/C27 OPEN). No role, salary or perk is shown, the page is noindex and out of the sitemap
 * (src/seo/seo.ts), and the one call to action is a link to the contact form. Text only and no
 * entrance animation, like the other inner pages, so the whole page is in the prerendered HTML.
 * Copy: src/content/careers/careers.ts.
 */
const Careers = () => (
  <>
    <section
      data-careers-section="hero"
      aria-labelledby="careers-heading"
      className="bg-gradient-to-br from-primary via-primary-light to-primary text-white"
    >
      <div className={`${container} pt-28 pb-16 md:pt-36 md:pb-20`}>
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/90">{BUSINESS.serviceAreaText}</p>
          <h1 id="careers-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
            {CAREERS.headline}
          </h1>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-[65ch]">{CAREERS.body}</p>
          <div className="pt-2">
            {/* One link styled as a button, never a <button> nested inside an <a> (STS-056). */}
            <Button asChild variant="primary" size="xl" className="w-full sm:w-auto" iconEnd={<ArrowRight />}>
              <Link to={CAREERS_CONTACT_PATH}>{CAREERS.cta}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
    {/* STS-046: sitewide trust slot; the contact link above stays the page's only call to action. */}
    <TrustSlot id="careers" standalone />
  </>
);

export default Careers;
