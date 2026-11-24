/**
 * Contact form submission: one place that decides what the user is told.
 *
 * Success only when the server answers 2xx, with a JSON body, and `success: true`.
 * Anything else (an HTML error page from a proxy, a 5xx, a dropped connection) is a
 * failure with a friendly message; a raw parser or network error is never shown.
 */

export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  /** Honeypot: humans never see or fill it. */
  nickname: string;
}

export type ContactFailureKind = "validation" | "rate_limited" | "server" | "network";

export type ContactResult =
  | { ok: true }
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
  source?: "google" | "referral" | "social" | "ads" | "other";
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
    return { ok: true };
  }

  if (response.status === 400 || response.status === 422) {
    return { ok: false, kind: "validation", message: serverMessage(body) ?? CONTACT_MESSAGES.validation };
  }

  return { ok: false, kind: "server", message: CONTACT_MESSAGES.server };
}
