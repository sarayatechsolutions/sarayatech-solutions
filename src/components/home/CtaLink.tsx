import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { CtaId } from "@/lib/analytics";

interface CtaLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  /** STS-050: fixed id for the cta_click event (data-track-cta). Omit for untracked links. */
  cta?: CtaId;
}

/**
 * Link for a call to action whose destination may be internal ("/contact") or external (a
 * verified booking URL from `bookingHref()`). Internal paths use the router; external URLs open
 * in a new tab without leaking the opener.
 */
const CtaLink = ({ href, className, children, cta }: CtaLinkProps) =>
  href.startsWith("/") ? (
    <Link to={href} className={className} data-track-cta={cta}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} data-track-cta={cta}>
      {children}
    </a>
  );

export default CtaLink;
