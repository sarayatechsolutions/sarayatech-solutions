// STS-049 (GAP-08): a production build must know where the separate Express
// backend lives. Without VITE_API_URL the chat and contact form call a relative
// /api/*, which Cloudflare Pages does not serve. This module never echoes any
// env value other than the variable NAME.

export const API_URL_VAR = "VITE_API_URL";

const LOCAL_HTTP = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

/** Returns an error message when the value is unacceptable, otherwise null. */
export function validateApiUrl(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  const where =
    "Set it in Cloudflare Pages -> Settings -> Environment variables (Production), " +
    "e.g. https://<your-backend-host>. For a local build use http://localhost:3001.";
  if (!v) {
    return `${API_URL_VAR} is not set. The production build would ship a site whose contact form and chat call a relative /api/* that Cloudflare Pages does not serve. ${where}`;
  }
  if (v.startsWith("https://") || LOCAL_HTTP.test(v)) {
    try {
      new URL(v);
      return null;
    } catch {
      /* fall through */
    }
  }
  return `${API_URL_VAR} must be an absolute https:// URL (http://localhost is allowed for local preview only). ${where}`;
}

/** Throws for production builds with a missing or invalid API URL. */
export function assertApiUrl(
  command: string,
  mode: string,
  env: Record<string, string | undefined>,
): void {
  if (command !== "build" || mode !== "production") return;
  const problem = validateApiUrl(env[API_URL_VAR]);
  if (problem) throw new Error(`[require-api-url] ${problem}`);
}
