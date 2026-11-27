/**
 * FF-10: a call to action that leads to the contact form says what was asked for.
 *
 * A service page's consultation CTA links to `/contact?service=<slug>` and a pricing card to
 * `/contact?package=<id>`; the form then preselects the matching Service Interest and, for a
 * package, starts the (editable) message with the package name. Only while booking is unverified:
 * a verified booking URL is used as it is, untouched.
 *
 * The query string is visitor-controlled input, so it is read through an allow-list and nothing
 * else: a value must equal a known slug or package id exactly (case-sensitive, no trimming).
 * Anything unknown, repeated or malformed is ignored, and the form keeps its defaults. The value is
 * never rendered as text and never sent: only the matching constant from SERVICE_INTERESTS (the
 * backend's own list) or a sentence built from our own package name reaches the form.
 * Analytics never sees it either (src/lib/analytics.ts cleanLocation drops the query string).
 */
import { CONTACT_PATH } from "@/config/business";
import { SERVICE_PAGES, type ServiceSlug } from "@/content/services/services";
import { PRICING_CUSTOM, PRICING_PACKAGES } from "@/content/pricing/pricing";
import { SERVICE_INTERESTS } from "@/content/forms/service-interest";

export const CONTACT_CONTEXT_PARAMS = { service: "service", package: "package" } as const;

export type PackageId = (typeof PRICING_PACKAGES.packages)[number]["id"] | typeof PRICING_CUSTOM.card.id;

export type ContactContextLink = { service: ServiceSlug } | { package: PackageId };

/** What the form starts from. Both keys optional; `{}` means "no context, keep the defaults". */
export interface ContactContext {
  /** A value of SERVICE_INTERESTS. */
  service?: string;
  /** The opening line of the message. */
  message?: string;
}

// OWNER REVIEW: wording of the prefilled message.
export const CONTACT_CONTEXT_COPY = {
  packageMessage: (name: string) => `I'd like a quote for the ${name} package.`,
  customMessage: "I'd like a quote for a custom app or software project.",
} as const;

/** The custom card is for apps and software, so it preselects App Development. */
const CUSTOM_SERVICE_SLUG: ServiceSlug = "app-development";

const serviceLabel = (slug: string): string | undefined => {
  const label = SERVICE_PAGES.find((p) => p.slug === slug)?.navLabel;
  return label && SERVICE_INTERESTS.includes(label) ? label : undefined;
};

/** The single value of `key`, or undefined when it is absent or given more than once. */
const single = (params: URLSearchParams, key: string): string | undefined => {
  const all = params.getAll(key);
  return all.length === 1 ? all[0] : undefined;
};

/** Reads `?service=` / `?package=` from a query string. Unknown values give `{}`. */
export function contactContext(search: string): ContactContext {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return {};
  }
  const ctx: ContactContext = {};

  const pkg = single(params, CONTACT_CONTEXT_PARAMS.package);
  if (pkg !== undefined) {
    const found = PRICING_PACKAGES.packages.find((p) => p.id === pkg);
    if (found) ctx.message = CONTACT_CONTEXT_COPY.packageMessage(found.name);
    else if (pkg === PRICING_CUSTOM.card.id) {
      ctx.message = CONTACT_CONTEXT_COPY.customMessage;
      ctx.service = serviceLabel(CUSTOM_SERVICE_SLUG);
    }
  }

  const slug = single(params, CONTACT_CONTEXT_PARAMS.service);
  if (slug !== undefined) {
    const label = serviceLabel(slug);
    if (label) ctx.service = label;
  }

  if (ctx.service === undefined) delete ctx.service;
  return ctx;
}

/**
 * The CTA href for a context: `/contact?…` when `base` is the contact form (booking unverified),
 * otherwise `base` unchanged (a verified booking URL carries no query of ours).
 */
export function contactHrefFor(link: ContactContextLink, base: string): string {
  if (base !== CONTACT_PATH) return base;
  const params = new URLSearchParams(
    "service" in link ? { [CONTACT_CONTEXT_PARAMS.service]: link.service } : { [CONTACT_CONTEXT_PARAMS.package]: link.package },
  );
  return `${CONTACT_PATH}?${params.toString()}`;
}
