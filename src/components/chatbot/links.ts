/**
 * True only for same-origin, root-relative app paths such as "/solutions".
 * Protocol-relative ("//evil.example") and backslash ("/\evil.example") forms are
 * treated by browsers as another host, so they are external.
 */
export function isInternalHref(href: string | undefined | null): href is string {
  return typeof href === "string" && /^\/(?!\/|\\)/.test(href);
}
