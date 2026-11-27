/**
 * The chat's link allow-list (FF-5), layered ON TOP of the shared classifier in src/lib/links.ts.
 *
 * Bot replies are untrusted: they can come from the LLM, which a visitor can steer. classifyHref
 * already refuses every unsafe scheme (javascript:, data:, ...) and normalises paths. The chat then
 * narrows what may become a link at all:
 *
 *  - internal : a root-relative path that is a live public route (src/routes.tsx), or an absolute
 *               URL on this site's own host that names one. Routed in-app with the normalised path.
 *  - external : an https URL whose host is on the configured allow-list: the booking host once
 *               booking is verified, and the social profiles that are set (src/config/business.ts).
 *  - text     : everything else, including any other host, "//host" and a path that is not a route.
 *
 * The blog body keeps using classifyHref directly; this layer is the chat's alone.
 */
import { classifyHref, type LinkTarget } from "@/lib/links";
import { BUSINESS, hasVerifiedBooking, socialLinks } from "@/config/business";
import { getPublicPaths } from "@/routes";

type BusinessArg = Parameters<typeof hasVerifiedBooking>[0];

export interface ChatLinkPolicyOptions {
  /** Business facts to read the allow-list from. Default: the shared BUSINESS config. */
  business?: BusinessArg;
  /** Live public paths. Default: getPublicPaths() from the router. */
  routes?: Iterable<string>;
  /** This site's own origin. Default: BUSINESS.siteUrl. */
  siteUrl?: string;
}

export type ChatLinkPolicy = (href: string | undefined | null) => LinkTarget;

const TEXT: LinkTarget = { kind: "text" };

/** "www.example.com" and "example.com" name the same site. */
function hostVariants(host: string): string[] {
  const h = host.toLowerCase();
  return h.startsWith("www.") ? [h, h.slice(4)] : [h, `www.${h}`];
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** "/services/" and "/services" are the same route; query and hash do not change the page. */
function routeKey(path: string): string {
  const bare = path.split(/[?#]/, 1)[0];
  return bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
}

/** The external hosts a chat reply may link to. Empty with the config as shipped. */
export function chatExternalHosts(business?: BusinessArg): Set<string> {
  const cfg = business ?? (BUSINESS as unknown as BusinessArg);
  const urls: string[] = [];
  if (hasVerifiedBooking(cfg)) urls.push(cfg!.booking.url);
  for (const [, url] of socialLinks(cfg)) urls.push(url);
  return new Set(urls.map(hostOf).filter((h): h is string => !!h).flatMap(hostVariants));
}

export function createChatLinkPolicy(options: ChatLinkPolicyOptions = {}): ChatLinkPolicy {
  // Read lazily: the route table imports every page, and this module must not need it at load time.
  let routes: Set<string> | null = null;
  const liveRoutes = () => (routes ??= new Set([...(options.routes ?? getPublicPaths())].map(routeKey)));
  const siteHosts = new Set(hostVariants(hostOf(options.siteUrl ?? BUSINESS.siteUrl) ?? ""));
  const external = chatExternalHosts(options.business);

  const internalIfRoute = (href: string): LinkTarget =>
    liveRoutes().has(routeKey(href)) ? { kind: "internal", href } : TEXT;

  return (href) => {
    const target = classifyHref(href);
    if (target.kind === "internal") return internalIfRoute(target.href);
    if (target.kind !== "external") return TEXT;

    let url: URL;
    try {
      url = new URL(target.href);
    } catch {
      return TEXT;
    }
    // Plain http is never linked: an allow-listed host is still reached over https only.
    if (url.protocol !== "https:" || url.username || url.password || url.port) return TEXT;
    const host = url.hostname.toLowerCase();
    // A link to this very site is routed in-app, under the same live-route rule.
    if (siteHosts.has(host)) return internalIfRoute(`${url.pathname}${url.search}${url.hash}`);
    return external.has(host) ? { kind: "external", href: url.href } : TEXT;
  };
}

/** The policy the chat uses: the shared business config and the live route table. */
export const classifyChatHref: ChatLinkPolicy = createChatLinkPolicy();

/**
 * Bare root-relative page paths in reply text ("Details: /services/local-seo"). The same rule the
 * route test uses (src/services/chatbot.routes.test.ts): not "24/7", "and/or", a URL's own path or
 * an /api/ call. Only a path that is also a live route is turned into a link.
 */
export const BARE_PATH = /(?<![\w.:/])\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*/gi;
