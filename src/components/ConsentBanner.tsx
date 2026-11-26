import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CONSENT_BANNER } from "@/content/legal/consent";
import { PRIVACY_PATH } from "@/content/legal/legal";
import type { ConsentChoice } from "@/lib/analytics";

interface ConsentBannerProps {
  onChoice: (choice: ConsentChoice) => void;
}

/**
 * Analytics consent banner (STS-050). Client-only: <Analytics> mounts it after hydration, and only
 * when a GA4 id is configured and no choice is stored, so it is never in the prerendered HTML.
 *
 * A named, non-modal region: no focus trap, the page stays usable, and it is reached by Tab after
 * the page content. Accept and Decline are the same component, size and colour (equal weight),
 * each at least 44 px tall.
 *
 * Layout: base styles are the 320-390 px phone. It sits above the chat launcher (fixed
 * bottom-6 right-6, 64 px, so its top edge is 88 px up); `bottom-28` (112 px) keeps a 24 px gap.
 * From `sm` it moves to the bottom-left corner, max 28rem wide: at 640 px it ends at 472 px, the
 * launcher starts at 552 px. The open chat panel is z-50, above this z-40 banner.
 *
 * Contrast (src/index.css tokens): foreground on background 15.9:1; primary link on background
 * 12.5:1; button label primary-foreground on primary 12.5:1 (hover primary/90: 9.3:1); focus ring (--ring) 12.5:1.
 */
const ConsentBanner = ({ onChoice }: ConsentBannerProps) => (
  <section
    aria-labelledby="consent-banner-heading"
    data-consent-banner=""
    tabIndex={-1}
    className="fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 inset-x-2 bottom-28 z-40 rounded-xl border border-border bg-background p-4 text-foreground shadow-lg sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-md"
  >
    <h2 id="consent-banner-heading" className="text-base font-semibold">
      {CONSENT_BANNER.heading}
    </h2>
    <p className="mt-1 text-sm leading-relaxed">
      {CONSENT_BANNER.body}{" "}
      <Link
        to={PRIVACY_PATH}
        className="inline-flex min-h-6 items-center rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {CONSENT_BANNER.linkText}
      </Link>
    </p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Button type="button" className="min-h-11 h-auto whitespace-normal" onClick={() => onChoice("granted")}>
        {CONSENT_BANNER.accept}
      </Button>
      <Button type="button" className="min-h-11 h-auto whitespace-normal" onClick={() => onChoice("denied")}>
        {CONSENT_BANNER.decline}
      </Button>
    </div>
  </section>
);

export default ConsentBanner;
