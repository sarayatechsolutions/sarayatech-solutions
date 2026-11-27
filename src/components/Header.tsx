import { useEffect, useRef, useState, type RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Menu, MessageSquare, Phone, X } from "lucide-react";
import { BUSINESS, bookingHref, contactHref, hasVerifiedBooking, phoneHref, smsHref } from "@/config/business";
import { WORK_PATH } from "@/content/work/work";
import { ENTER_BASE, EXIT_FAST } from "@/design/motion";

/**
 * Site header (STS-038).
 *
 * Every business fact comes from src/config/business.ts through its helpers, so the header is
 * correct with the documented fallbacks today and updates itself once the owner fills the config:
 *  - phone (C2): the tel: action renders only when a valid E.164 number is configured, and the
 *    sms: action only when the owner has also confirmed it receives texts (STS-045). With no
 *    number nothing renders: no dead link, no placeholder;
 *  - booking (C15): the primary CTA reads "Book a Free Consultation" and opens the booking page only
 *    when the link is verified; otherwise it reads "Contact Us" and goes to the /contact form.
 *
 * The header is `position: fixed`, so the CTA (and the phone action, when present) stay visible
 * while scrolling at every width, including 320-375 px phones (REQ-034, REQ-163).
 * `config` is a test seam; production always uses BUSINESS.
 */
type HelperConfig = NonNullable<Parameters<typeof phoneHref>[0]>;
export type HeaderConfig = HelperConfig & { name: string };

/** Id of the <main> element in Layout, target of the skip link. */
export const MAIN_CONTENT_ID = "main-content";
const MOBILE_MENU_ID = "mobile-menu";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface NavItem {
  name: string;
  path: string;
  /** Extra path prefixes that belong to this section (detail pages). */
  section?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { name: "Home", path: "/" },
  // STS-039: /solutions and /industries are retired (301 in public/_redirects); the service hub replaces them.
  { name: "Services", path: "/services", section: ["/services/"] },
  // STS-057: Our Work lives at /our-work (the old /realisation is a 301).
  { name: "Our Work", path: WORK_PATH },
  // STS-057 (GAP-12): the packages page (STS-033) is in the main nav.
  { name: "Pricing", path: "/pricing" },
  { name: "About", path: "/about" },
];

/** "/about/" and "/about" are the same page (a static host may serve either). */
const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") || "/" : path);

const CONTACT_ITEM: NavItem = { name: "Contact", path: contactHref() };

/**
 * FD-30 / FF-16: while the mobile menu is open the page behind it does not scroll. The scrollbar
 * width (0 on phones, about 15 px on a narrow desktop window) is given back as padding on the body
 * and on the fixed header, so nothing shifts sideways. Every style is restored on close and unmount.
 */
function useScrollLock(locked: boolean, headerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!locked) return;
    const { body, documentElement } = document;
    const header = headerRef.current;
    const scrollbar = Math.max(0, window.innerWidth - documentElement.clientWidth);
    const before = { overflow: body.style.overflow, bodyPad: body.style.paddingRight, headerPad: header?.style.paddingRight ?? "" };
    body.style.overflow = "hidden";
    if (scrollbar > 0) {
      body.style.paddingRight = `${scrollbar}px`;
      if (header) header.style.paddingRight = `${scrollbar}px`;
    }
    return () => {
      body.style.overflow = before.overflow;
      body.style.paddingRight = before.bodyPad;
      if (header) header.style.paddingRight = before.headerPad;
    };
  }, [locked, headerRef]);
}

const Header = ({ config = BUSINESS }: { config?: HeaderConfig }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();

  const verifiedBooking = hasVerifiedBooking(config);
  const tel = phoneHref(config);
  const sms = smsHref(config);
  const phoneLabel = config.phone?.display || config.phone?.tel || "";
  // STS-045: every action is named for who you reach and how. The bar's icon links carry the
  // number in their name because the call link shows it as its visible label at xl (WCAG 2.5.3);
  // the menu buttons are named by their visible text. `data-cta` + `data-cta-location` are the
  // hooks for the phone_click / text_click events (STS-050).
  const callName = `Call ${config.name} at ${phoneLabel}`;
  const textName = `Text ${config.name} at ${phoneLabel}`;

  // When the CTA goes to the booking page, the contact form still needs a way in from the nav.
  const navigation = verifiedBooking ? [...NAV_ITEMS, CONTACT_ITEM] : NAV_ITEMS;

  // The CTA is labelled for where it goes (REQ-175). On the narrowest phones only the first word
  // is shown (below 360 px for "Contact Us", below `sm` for "Book a Free Consultation", so the bar
  // still fits at 320 px with a phone action); the rest stays in the accessible name, which
  // therefore always contains the visible label (WCAG 2.5.3).
  const cta = verifiedBooking
    ? { href: bookingHref(config), external: true, lead: "Book", rest: " a Free Consultation", restShown: "sm:not-sr-only" }
    : { href: contactHref(), external: false, lead: "Contact", rest: " Us", restShown: "min-[360px]:not-sr-only" };

  // Active state (STS-057): the link to the page you are on is aria-current="page"; on a detail page
  // (/services/website-design) its section link (Services) is styled active and aria-current="true",
  // because that link is not the current page itself. Same rule on desktop and mobile.
  const here = normalizePath(pathname);
  const isCurrent = (item: NavItem) => here === item.path;
  const isInSection = (item: NavItem) =>
    isCurrent(item) || (item.section ?? []).some((prefix) => here.startsWith(prefix));
  const ariaCurrent = (item: NavItem) => (isCurrent(item) ? "page" : isInSection(item) ? "true" : undefined);

  // Close the menu on navigation.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Escape closes the menu and returns focus to its toggle.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  useScrollLock(isMenuOpen, headerRef);

  // The menu, its scrim and the scroll lock are below `lg` only: widening the window past it closes
  // the menu, so a hidden menu can never keep the page locked.
  useEffect(() => {
    if (!isMenuOpen || typeof window.matchMedia !== "function") return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => desktop.matches && setIsMenuOpen(false);
    onChange();
    desktop.addEventListener?.("change", onChange);
    return () => desktop.removeEventListener?.("change", onChange);
  }, [isMenuOpen]);

  // A tap or click outside the menu (on the scrim) closes it. Focus goes back to the toggle when it
  // was in the menu, which is about to unmount, so it is never lost to <body>.
  const closeFromScrim = () => {
    const menu = document.getElementById(MOBILE_MENU_ID);
    const active = document.activeElement;
    setIsMenuOpen(false);
    if (!active || active === document.body || menu?.contains(active)) toggleRef.current?.focus({ preventScroll: true });
  };

  const ctaLabel = (
    <span>
      {cta.lead}
      <span className={`sr-only ${cta.restShown}`}>{cta.rest}</span>
      {cta.external && <span className="sr-only"> (opens in a new tab)</span>}
    </span>
  );

  // Design audit B3: the secondary (navy) md button. Only layout is added here: tighter side padding
  // below `sm` and no wrapping, so the bar still fits at 320 px.
  const ctaClass = `px-3 sm:px-5 whitespace-nowrap ${focusRing}`;

  return (
    <>
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm">
        <a
          href={`#${MAIN_CONTENT_ID}`}
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-20">
            <Link to="/" className={`shrink-0 rounded-md transition-opacity duration-fast ease-standard hover:opacity-80 ${focusRing}`}>
              {/* Design audit B2 (FD-02): the only colour logo is public/logo.png, a JPEG whose light
                  grey (#F7F7F7) backdrop is baked into the pixels; no box styling is added on top. A
                  transparent logo.svg is an OWNER INPUT: swap it in here when supplied (same alt, real
                  width/height). Sized to at least 120 px wide at 390 px (127 px), intrinsic
                  width/height kept so the box is reserved before the image loads (no CLS). */}
              <img
                src="/logo.png"
                alt={`${config.name} home`}
                width={989}
                height={373}
                className="h-11 w-auto min-[380px]:h-12 sm:h-14 xl:h-16"
              />
            </Link>

            {/* Desktop navigation */}
            <nav aria-label="Main" className="hidden lg:block">
              <ul className="flex items-center gap-6 xl:gap-8">
                {navigation.map((item) => {
                  const active = isInSection(item);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        aria-current={ariaCurrent(item)}
                        className={`relative group rounded-sm text-sm font-medium transition-colors duration-fast ease-standard ${focusRing} ${
                          active ? "text-primary" : "text-secondary hover:text-primary"
                        }`}
                      >
                        {item.name}
                        <span
                          aria-hidden="true"
                          className={`absolute -bottom-2 left-0 w-full h-0.5 bg-primary transform origin-left transition-transform duration-base ease-standard ${
                            active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                          }`}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Contact actions: always in the bar, so they stay visible while scrolling */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {tel && phoneLabel && (
                <a
                  href={tel}
                  aria-label={callName}
                  data-cta="phone_click"
                  data-cta-location="header"
                  className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-primary transition-colors duration-fast ease-standard hover:bg-muted ${focusRing}`}
                >
                  <Phone aria-hidden="true" className="h-5 w-5" />
                  <span className="hidden xl:inline text-sm font-semibold">{phoneLabel}</span>
                </a>
              )}

              {/* Text action in the bar from `sm` to `lg` only: below sm it would not fit beside the
                  CTA at 320 px, so it lives in the menu; desktops rarely send texts. */}
              {sms && phoneLabel && (
                <a
                  href={sms}
                  aria-label={textName}
                  data-cta="text_click"
                  data-cta-location="header"
                  className={`hidden sm:inline-flex lg:hidden h-11 w-11 items-center justify-center rounded-md text-primary transition-colors duration-fast ease-standard hover:bg-muted ${focusRing}`}
                >
                  <MessageSquare aria-hidden="true" className="h-5 w-5" />
                </a>
              )}

              <Button asChild variant="secondary" className={ctaClass}>
                {cta.external ? (
                  <a href={cta.href} target="_blank" rel="noopener noreferrer" data-track-cta="header_cta">
                    {ctaLabel}
                  </a>
                ) : (
                  <Link to={cta.href} data-track-cta="header_cta">
                    {ctaLabel}
                  </Link>
                )}
              </Button>

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-expanded={isMenuOpen}
                aria-controls={MOBILE_MENU_ID}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                className={`lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground transition-colors duration-fast ease-standard hover:bg-muted ${focusRing}`}
              >
                {isMenuOpen ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile menu: opacity + transform only; MotionConfig reducedMotion="user" drops the slide.
              Enter base / exit fast, from the shared motion tokens (src/design/motion.ts). */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.nav
                id={MOBILE_MENU_ID}
                aria-label="Main"
                className="lg:hidden max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-border py-4"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0, transition: ENTER_BASE }}
                exit={{ opacity: 0, y: -8, transition: EXIT_FAST }}
              >
                <ul className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        aria-current={ariaCurrent(item)}
                        className={`flex min-h-11 items-center rounded-md border-l-4 px-4 font-medium transition-colors duration-fast ease-standard ${focusRing} ${
                          // Not colour alone: the active row also carries a left bar (WCAG 1.4.1).
                          isInSection(item)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-transparent text-secondary hover:bg-muted hover:text-primary"
                        }`}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                {tel && phoneLabel && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
                    <Button asChild variant="outline" className={`h-11 w-full ${focusRing}`}>
                      <a href={tel} data-cta="phone_click" data-cta-location="menu">
                        <Phone aria-hidden="true" />
                        Call {config.name}
                      </a>
                    </Button>
                    {sms && (
                      <Button asChild variant="outline" className={`h-11 w-full ${focusRing}`}>
                        <a href={sms} data-cta="text_click" data-cta-location="menu">
                          <MessageSquare aria-hidden="true" />
                          Text {config.name}
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* FD-30 / FF-16: the scrim behind the open menu. Below the header (z-40 under z-50), so the bar,
          its Contact Us CTA and the menu panel stay on top; a tap or click anywhere on it closes the menu.
          It closes on click, not on press: the scrim is still the click target when the click lands, so the
          tap never falls through to a link behind it (it is removed at once under reduced motion), and a
          browser that moved focus to the body on the press is caught by closeFromScrim.
          Decorative for assistive tech: Escape and the toggle are the keyboard way out. Under reduced
          motion it appears and disappears without a fade. */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="menu-scrim"
            aria-hidden="true"
            data-menu-scrim=""
            onClick={closeFromScrim}
            className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: reduceMotion ? { duration: 0 } : ENTER_BASE }}
            exit={{ opacity: 0, transition: reduceMotion ? { duration: 0 } : EXIT_FAST }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
