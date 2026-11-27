import { Link } from "react-router-dom";
import { Linkedin, Twitter, Facebook, Youtube } from "lucide-react";
import { BUSINESS, contactHref, emailHref, hasAddress, hasHours, phoneHref, socialLinks } from "@/config/business";
import { SERVICE_PAGES, servicePath } from "@/content/services/services";
import { PRIVACY_PATH, TERMS_PATH } from "@/content/legal/legal";
import { WORK_PATH } from "@/content/work/work";
import { GA4_ID } from "@/config/analytics";
import { CONSENT_BANNER } from "@/content/legal/consent";
import { openConsentSettings } from "@/lib/analytics";

/**
 * Site footer (STS-038).
 *
 * NAP (name, address-or-service-area, phone, email) and social links come only from
 * src/config/business.ts through its helpers: an unconfirmed fact is not rendered at all, and
 * there is never an empty tel:/mailto: or an href="#" (REQ-037, REQ-173).
 * Every link points to a route in src/routes.tsx (REQ-018, REQ-158); there is no dead control.
 * `config` is a test seam; production always uses BUSINESS.
 */
type HelperConfig = NonNullable<Parameters<typeof phoneHref>[0]>;
export type FooterConfig = HelperConfig & { name: string; serviceAreaText: string };

/**
 * Evaluated when the module loads: at build time for the prerendered HTML. The span that shows it
 * suppresses the hydration warning, so a page built last year keeps its own year until the next
 * build instead of discarding the server markup.
 */
const COPYRIGHT_YEAR = String(new Date().getFullYear());

const SOCIAL_NETWORKS = {
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
  twitter: { Icon: Twitter, label: "X (Twitter)" },
  facebook: { Icon: Facebook, label: "Facebook" },
  youtube: { Icon: Youtube, label: "YouTube" },
} as const;

/** The five service pages (STS-032, REQ-006). They are routed from the same list, so never dead. */
const SERVICE_LINKS = SERVICE_PAGES.map((p) => ({ label: p.navLabel, to: servicePath(p.slug) }));

const COMPANY_LINKS = [
  { label: "About Us", to: "/about" },
  { label: "Our Work", to: WORK_PATH },
  { label: "Pricing", to: "/pricing" },
  { label: "Careers", to: "/careers" },
  { label: "Contact", to: contactHref() },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", to: PRIVACY_PATH },
  { label: "Terms of Use", to: TERMS_PATH },
];

// OWNER REVIEW: the positioning line, from the second sentence of the home subheadline.
const POSITIONING = "One partner for your website, app, Google presence and social media.";

const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark";

/**
 * Design audit B7 (FD-29). Touch targets: 44 px rows below md, and on any coarse pointer (a tablet
 * at md+). Only a fine pointer at md+ gets the compact 28 px row; with the 4 px gap between rows
 * that is a 32 px pitch, above the 24 px of WCAG 2.2 2.5.8.
 */
const linkClass = `inline-flex min-h-11 items-center text-small text-white/80 underline-offset-4 transition-colors duration-fast ease-standard hover:text-white hover:underline md:[@media(pointer:fine)]:min-h-7 ${focusRing}`;

const headingClass = "text-eyebrow uppercase text-white mb-3 md:mb-4";
const listClass = "md:space-y-1";

const Footer = ({ config = BUSINESS, analyticsId = GA4_ID }: { config?: FooterConfig; analyticsId?: string | null }) => {
  const social = socialLinks(config).flatMap(([network, url]) => {
    const entry = SOCIAL_NETWORKS[network as keyof typeof SOCIAL_NETWORKS];
    return entry ? [{ network, url, ...entry }] : [];
  });
  const tel = phoneHref(config);
  const mailto = emailHref(config);
  const services = SERVICE_LINKS;

  return (
    // Design audit B7 (FD-26): primary-dark (white 15.38:1) with a hairline top border, one step
    // darker than the FinalCta's navy gradient, so the two blocks no longer merge into one slab.
    <footer className="bg-primary-dark text-primary-foreground border-t border-white/10">
      {/* pb-28 below md keeps the last line clear of the floating chat launcher (bottom-right). */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-28 md:pt-16 md:pb-8">
        {/* FD-29: 12 columns at lg: brand 5, Services 3, Company 2, Legal 2. Two link columns side by
            side below lg, Legal under them. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 mb-10 md:grid-cols-6 lg:grid-cols-12 lg:gap-x-10 lg:mb-12">
          {/* Brand + NAP */}
          <div className="col-span-2 md:col-span-6 lg:col-span-5 lg:pr-8">
            <Link to="/" className={`inline-block transition-opacity duration-fast ease-standard hover:opacity-80 ${focusRing}`}>
              {/* Design audit B2 (FD-02): logo-white.webp is transparent but carries wide empty
                  margins (mark at 16-295 x 40-143 of 300 x 200). Instead of a 125% scale, which grew
                  the image past its own box, the box is sized to the mark (56 px tall, 152 px wide)
                  and object-cover crops the empty margin. Same pixels, no redraw; a trimmed white
                  logo.svg is an OWNER INPUT. The offset is in px, not %: the image renders 152 x 101
                  and -18 px centres the mark (y 40-143) in the 56 px box. A "%" in the markup would
                  trip the /our-work smoke guard against unsourced percentage claims. */}
              <img
                src="/logo-white.webp"
                width={300}
                height={200}
                alt={`${config.name} home`}
                className="h-14 w-[152px] object-cover object-[center_-18px]"
              />
            </Link>
            {/* The old "digital transformation" tagline is banned copy (REQ-012); this line is not. */}
            <p className="mt-4 max-w-sm text-small text-white/80">{POSITIONING}</p>

            <address className="not-italic mt-6 mb-6 space-y-1 text-small text-white/80">
              <p className="font-semibold text-white">{config.name}</p>
              {hasAddress(config) ? (
                <p>
                  {config.address?.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              ) : (
                <p>{config.serviceAreaText}</p>
              )}
              {tel && (
                <p>
                  <a href={tel} className={linkClass}>
                    {config.phone?.display || config.phone?.tel}
                  </a>
                </p>
              )}
              {mailto && (
                <p>
                  <a href={mailto} className={`${linkClass} break-all`}>
                    {config.email}
                  </a>
                </p>
              )}
              {hasHours(config) &&
                config.hours?.map((line) => (
                  <p key={line}>{line}</p>
                ))}
            </address>

            {social.length > 0 && (
              <ul className="flex flex-wrap gap-3" aria-label={`${config.name} on social media`}>
                {social.map(({ network, url, Icon, label }) => (
                  <li key={network}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${config.name} on ${label} (opens in a new tab)`}
                      className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors duration-fast ease-standard hover:bg-white/20 ${focusRing}`}
                    >
                      <Icon aria-hidden="true" size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav aria-label="Services" className="md:col-span-2 lg:col-span-3">
            <h2 className={headingClass}>Services</h2>
            <ul className={listClass}>
              {services.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/services" className={linkClass}>
                  All Services
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Company" className="md:col-span-2 lg:col-span-2">
            <h2 className={headingClass}>Company</h2>
            <ul className={listClass}>
              {COMPANY_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* STS-037 (REQ-046): legal pages; drafts are noindex until C23, but the links always resolve. */}
          <nav aria-label="Legal" className="col-span-2 md:col-span-2 lg:col-span-2">
            <h2 className={headingClass}>Legal</h2>
            <ul className={listClass}>
              {LEGAL_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
              {/* STS-071: only when analytics can run, so a visitor can change or withdraw consent. */}
              {analyticsId !== null && (
                <li>
                  <button type="button" className={linkClass} onClick={() => openConsentSettings(analyticsId)}>
                    {CONSENT_BANNER.settingsLink}
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-small text-white/70">
            © <span suppressHydrationWarning>{COPYRIGHT_YEAR}</span> {config.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
