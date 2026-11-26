/**
 * Analytics switch (STS-050, REQ-043, owner input C17).
 *
 * Analytics is OFF unless a well-formed GA4 measurement id is configured. There are two ways to
 * set it; the first valid one wins:
 *   1. `BUSINESS.ga4Id` in src/config/business.ts (the business-facts file), or
 *   2. the build-time variable `VITE_GA4_ID` (Cloudflare Pages > Settings > Environment variables),
 *      then redeploy. Vite inlines it at build time; nothing is read at run time.
 * Anything that is not `G-` followed by 4 to 12 upper-case letters or digits is treated as unset,
 * so a typo, a placeholder or a stray space can never switch tracking on.
 *
 * This module is pure: no `window`, no `document`. It is safe to import from the prerender build.
 * Runbook: docs/ops/analytics.md.
 */
import { BUSINESS } from "./business";

/** GA4 measurement id format. */
export const GA4_ID_PATTERN = /^G-[A-Z0-9]{4,12}$/;

/** The id when it is a well-formed GA4 measurement id, otherwise null. */
export function validGa4Id(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return GA4_ID_PATTERN.test(id) ? id : null;
}

/** Config first, then the build-time env variable; null when neither is valid. */
export function resolveGa4Id(sources: { config?: unknown; env?: unknown } = {
  config: BUSINESS.ga4Id,
  env: import.meta.env.VITE_GA4_ID,
}): string | null {
  return validGa4Id(sources.config) ?? validGa4Id(sources.env);
}

/** The measurement id this build uses, or null (analytics off). */
export const GA4_ID: string | null = resolveGa4Id();

/** True only when a valid GA4 id is configured. */
export const analyticsConfigured = (id: string | null = GA4_ID): boolean => id !== null;
