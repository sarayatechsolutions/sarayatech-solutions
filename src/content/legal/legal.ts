/**
 * Shared shape and rules for the legal drafts (STS-037: REQ-046, REQ-149, REQ-173).
 *
 * The Privacy Policy and Terms of Use are DRAFTS until the owner and a lawyer approve them
 * (owner input C23 in docs/website-remediation/06-OWNER-INPUTS.md). While
 * `LEGAL_PAGES_APPROVED` is false:
 *  - both pages are prerendered and served (HTTP 200) so footer, form and chat links resolve;
 *  - both carry `<meta name="robots" content="noindex, follow">` (src/seo/seo.ts) and are left
 *    out of the sitemap (src/entry-server.tsx `sitemapPaths`);
 *  - both show DRAFT_NOTICE above the text.
 * Approval = flip the flag, fill every placeholder, update 06. No other file needs to change.
 *
 * COPY RULES (enforced by src/pages/Legal.test.tsx)
 *  - Every fact about data handling comes from the code (frontend + the Express backend) and is
 *    cited in the comment next to it. Nothing is assumed.
 *  - An unknown fact is an `ownerTodo(id, what)` placeholder tied to an owner-input id. It is
 *    never invented, and a null value from src/config/business.ts is never printed.
 *  - No compliance or certification claim (C21), and no "we never share your data": the
 *    service providers that receive data are named.
 */

/** C23: set to true only when the owner and a lawyer have approved both documents. */
export const LEGAL_PAGES_APPROVED = false;

export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";

export const DRAFT_NOTICE = {
  heading: "Draft — pending legal review",
  body: "This page is a draft. It has not yet been approved by the business owner or a lawyer, and it may change before it takes effect.",
} as const;

/**
 * REQ-149: the chat notice shown above the input before the first message. It names the same
 * processor as the Privacy Policy (OpenAI, via our server) and links to it.
 */
export const CHAT_PRIVACY_NOTICE = {
  text: "Chat messages are sent through our server to OpenAI, our AI provider, to generate replies. Please don't share sensitive information.",
  linkText: "Privacy Policy",
} as const;

/**
 * REQ-173: the line next to each form's submit button. It replaces the old "Your information
 * will never be shared." on /contact, which contradicted the policy (the email provider and the
 * hosts do receive form details).
 */
export const FORM_PRIVACY_NOTE = {
  text: "We use the details you send to reply to you. To see who receives them, read our",
  linkText: "Privacy Policy",
} as const;

/** Owner-input ids (06-OWNER-INPUTS.md, section C) a placeholder may reference. */
export const OWNER_INPUT_IDS = ["C1", "C3", "C4", "C17", "C23"] as const;
export type OwnerInputId = (typeof OWNER_INPUT_IDS)[number];

/** A visible, bracketed placeholder for a fact only the owner can supply. */
export const ownerTodo = (id: OwnerInputId, what: string): string => `[Owner to confirm: ${what} (${id})]`;

/** Matches every placeholder `ownerTodo` produces; group 1 = what, group 2 = the id. */
export const OWNER_TODO_PATTERN = /\[Owner to confirm: ([^\]]+?) \((C\d+)\)\]/g;

/** A run of text, or an in-site link rendered with the router. */
export type Inline = string | { text: string; to: string };
export type Block = { p: Inline[] } | { ul: Inline[][] };

export interface LegalSection {
  id: string;
  heading: string;
  blocks: Block[];
}

export interface LegalDocument {
  /** Route path. */
  path: string;
  /** The page's only h1. */
  title: string;
  intro: Inline[];
  sections: LegalSection[];
}

/** Effective date line shown under the h1. */
export const effectiveDateLine = (): string => `Effective date: ${ownerTodo("C23", "effective date")}`;

/** Every visible string of a document, for tests and placeholder inventories. */
export function documentText(doc: LegalDocument): string {
  const inline = (parts: Inline[]) => parts.map((p) => (typeof p === "string" ? p : p.text)).join("");
  const blocks = doc.sections.flatMap((s) => [
    s.heading,
    ...s.blocks.flatMap((b) => ("p" in b ? [inline(b.p)] : b.ul.map(inline))),
  ]);
  return [doc.title, inline(doc.intro), ...blocks].join("\n");
}
