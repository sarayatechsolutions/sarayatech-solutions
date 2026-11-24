import { Link } from "react-router-dom";
import { Linkedin, Twitter, Facebook, Youtube } from "lucide-react";
import { BUSINESS, contactHref, emailHref, hasAddress, hasHours, phoneHref, socialLinks } from "@/config/business";
import { SERVICE_PAGES, servicePath } from "@/content/services/services";
import { PRIVACY_PATH, TERMS_PATH } from "@/content/legal/legal";

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
  { label: "Our Work", to: "/realisation" },
  { label: "Careers", to: "/careers" },
  { label: "Contact", to: contactHref() },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", to: PRIVACY_PATH },
  { label: "Terms of Use", to: TERMS_PATH },
];

const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

const linkClass = `inline-flex min-h-11 items-center text-sm text-primary-foreground/80 transition-smooth hover:text-primary-foreground md:min-h-0 md:py-1 ${focusRing}`;

const Footer = ({ config = BUSINESS }: { config?: FooterConfig }) => {
  const social = socialLinks(config).flatMap(([network, url]) => {
    const entry = SOCIAL_NETWORKS[network as keyof typeof SOCIAL_NETWORKS];
    return entry ? [{ network, url, ...entry }] : [];
  });
  const tel = phoneHref(config);
  const mailto = emailHref(config);
  const services = SERVICE_LINKS;

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* pb-28 below md keeps the last line clear of the floating chat launcher (bottom-right). */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 md:pb-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 mb-12 lg:grid-cols-4">
          {/* Brand + NAP */}
          <div className="col-span-2">
            <Link to="/" className={`inline-block transition-smooth hover:opacity-80 ${focusRing}`}>
              <img
                src="/logo-white.webp"
                width={300}
                height={200}
                alt={`${config.name} home`}
                className="h-20 w-auto scale-125"
              />
            </Link>
            {/* No tagline: the old "digital transformation" line is banned copy (REQ-012). */}

            <address className="not-italic mb-6 space-y-2 text-sm text-primary-foreground/80">
              <p className="font-semibold text-primary-foreground">{config.name}</p>
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
                      className={`flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/10 transition-smooth hover:bg-primary-foreground/20 ${focusRing}`}
                    >
                      <Icon aria-hidden="true" size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav aria-label="Services">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 md:mb-6">Services</h2>
            <ul className="space-y-1 md:space-y-2">
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

          <nav aria-label="Company">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 md:mb-6">Company</h2>
            <ul className="space-y-1 md:space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t border-primary-foreground/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-primary-foreground/70">
            © <span suppressHydrationWarning>{COPYRIGHT_YEAR}</span> {config.name}. All rights reserved.
          </p>
          {/* STS-037 (REQ-046): legal pages; drafts are noindex until C23, but the links always resolve. */}
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-6">
              {LEGAL_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
