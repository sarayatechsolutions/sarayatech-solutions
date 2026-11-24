import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface CtaLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

/**
 * Link for a call to action whose destination may be internal ("/contact") or external (a
 * verified booking URL from `bookingHref()`). Internal paths use the router; external URLs open
 * in a new tab without leaking the opener.
 */
const CtaLink = ({ href, className, children }: CtaLinkProps) =>
  href.startsWith("/") ? (
    <Link to={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );

export default CtaLink;
