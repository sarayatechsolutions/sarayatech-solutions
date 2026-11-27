/**
 * Contact form submission: one place that decides what the user is told.
 *
 * Success only when the server answers 2xx, with a JSON body, and `success: true`.
 * Anything else (an HTML error page from a proxy, a 5xx, a dropped connection) is a
 * failure with a friendly message; a raw parser or network error is never shown.
 *
 * STS-084 (ADR 0003): a stored lead's 200 also carries `reference`, e.g. "REF-7K3QX9PM". It is
 * additive and optional (an older backend omits it), and it is shown to the visitor, so it is
 * accepted only when it matches LEAD_REFERENCE_PATTERN exactly. Anything else is treated as
 * absent: arbitrary server text is never rendered.
 */

import { isLeadSource, LEAD_SOURCE_INVALID, type LeadSource } from "@/content/forms/lead-source";

export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  /** STS-054: sent only when the visitor chose one; checked against LEAD_SOURCES before sending. */
  source?: LeadSource;
  /** Honeypot: humans never see or fill it. */
  nickname: string;
}

export type ContactFailureKind = "validation" | "rate_limited" | "server" | "network";

export type ContactResult =
  | { ok: true; reference?: string }
  | { ok: false; kind: ContactFailureKind; message: string };

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  phone: 30,
  company: 120,
  message: 5000,
} as const;

export const CONTACT_MESSAGES = {
  rateLimited: "Too many requests, please try again in a few minutes.",
  validation: "Please check the form fields and try again.",
  server: "We couldn't send your message right now. Please try again later.",
  network: "We couldn't reach our server. Please check your connection and try again.",
} as const;

const MAX_SERVER_MESSAGE = 200;

/**
 * The backend's lead reference: "REF-" and exactly 8 Crockford base32 characters
 * (0-9 and A-Z without I, L, O and U). Anchored, no flags: nothing before or after, no lower case.
 */
export const LEAD_REFERENCE_PATTERN = /^REF-[0-9A-HJKMNP-TV-Z]{8}$/;

/** The body's `reference` when it is a well-formed lead reference, otherwise undefined. */
export function leadReference(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("reference" in body)) return undefined;
  const ref = (body as { reference: unknown }).reference;
  return typeof ref === "string" && LEAD_REFERENCE_PATTERN.test(ref) ? ref : undefined;
}

function isJson(response: Response): boolean {
  return (response.headers.get("content-type") || "").toLowerCase().includes("application/json");
}

async function readJson(response: Response): Promise<unknown> {
  if (!isJson(response)) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function serverMessage(body: unknown): string | undefined {
  if (body && typeof body === "object" && "message" in body) {
    const msg = (body as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim() && msg.length <= MAX_SERVER_MESSAGE) return msg;
  }
  return undefined;
}

/** The audit lead form (STS-034): same endpoint, `leadType: "audit"`. */
export interface AuditPayload {
  leadType: "audit";
  name: string;
  email: string;
  company: string;
  website: string;
  phone?: string;
  message?: string;
  source?: LeadSource;
  /** Honeypot: humans never see or fill it. */
  nickname: string;
}

export function submitContact(
  payload: ContactPayload,
  options: { apiUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<ContactResult> {
  return postLead(payload, options);
}

export function submitAudit(
  payload: AuditPayload,
  options: { apiUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<ContactResult> {
  return postLead(payload, options);
}

async function postLead(
  payload: ContactPayload | AuditPayload,
  options: { apiUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<ContactResult> {
  const { apiUrl = import.meta.env.VITE_API_URL || "", fetchImpl = fetch } = options;

  // STS-054: a source outside the agreed list (a tampered select, a stale caller) is refused
  // here with the backend's own wording, so it never costs a request against the rate limit.
  if ("source" in payload && payload.source !== undefined && !isLeadSource(payload.source)) {
    return { ok: false, kind: "validation", message: LEAD_SOURCE_INVALID };
  }

  let response: Response;
  try {
    response = await fetchImpl(`${apiUrl}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, kind: "network", message: CONTACT_MESSAGES.network };
  }

  if (response.status === 429) {
    return { ok: false, kind: "rate_limited", message: CONTACT_MESSAGES.rateLimited };
  }

  const body = await readJson(response);

  if (response.ok && body && typeof body === "object" && (body as { success?: unknown }).success === true) {
    const reference = leadReference(body);
    return reference ? { ok: true, reference } : { ok: true };
  }

  if (response.status === 400 || response.status === 422) {
    return { ok: false, kind: "validation", message: serverMessage(body) ?? CONTACT_MESSAGES.validation };
  }

  return { ok: false, kind: "server", message: CONTACT_MESSAGES.server };
}
