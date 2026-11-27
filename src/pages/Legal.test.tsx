import { describe, it, expect } from "vitest";
import { render, sitemapPaths, paths } from "@/entry-server";
import { buildSitemapXml, getSeo, renderHeadTags } from "@/seo/seo";
import { getPublicPaths } from "@/routes";
import { BUSINESS } from "@/config/business";
import {
  DRAFT_NOTICE,
  LEGAL_PAGES_APPROVED,
  OWNER_INPUT_IDS,
  OWNER_TODO_PATTERN,
  documentText,
} from "@/content/legal/legal";
import { PRIVACY_POLICY } from "@/content/legal/privacy";
import { TERMS_OF_USE } from "@/content/legal/terms";
import { LEGAL_FORBIDDEN_PHRASES, buildRoutes } from "../../tests/smoke/smoke.mjs";

// STS-037 (REQ-046, REQ-149, REQ-173). Each page is rendered exactly as the build prerenders it
// (entry-server), then read as a document, so these hold for what a crawler or no-JS visitor gets.
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const parse = (url: string) => new DOMParser().parseFromString(render(url), "text/html");

const PAGES = [
  { path: "/privacy", h1: "Privacy Policy", doc: PRIVACY_POLICY },
  { path: "/terms", h1: "Terms of Use", doc: TERMS_OF_USE },
] as const;

/** Compliance or certification claims the owner has not supplied (C21); none is allowed. */
const COMPLIANCE_CLAIM = /\b(GDPR|CCPA|CPRA|HIPAA|SOC ?2|ISO ?27001|PCI)\b|\bcomplian(t|ce)\b|\bcertified\b/i;
/** A blanket no-sharing promise contradicts the named processors. */
const NEVER_SHARED = /never (be )?shared|never share|do not share|don't share your/i;

describe.each(PAGES)("$path, prerendered (REQ-046)", ({ path, h1, doc }) => {
  const page = parse(path);
  const article = page.querySelector("main article") as HTMLElement;
  const body = text(page.body);

  it("is a public route with exactly one h1, the document title, and a smoke entry", () => {
    expect(getPublicPaths()).toContain(path);
    expect(paths).toContain(path);
    const h1s = page.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe(h1);
    expect(doc.title).toBe(h1);
    const smoke = buildRoutes().find((r) => r.path === path);
    expect(smoke?.expectH1).toBe(h1);
    expect(smoke?.noindex).toBe(true);
  });

  it("shows the draft notice above the text while C23 is open", () => {
    expect(LEGAL_PAGES_APPROVED).toBe(false);
    const note = article.querySelector("[data-legal-draft]");
    expect(note).not.toBeNull();
    expect(note?.getAttribute("role")).toBe("note");
    expect(text(note)).toContain("Draft — pending legal review");
    expect(text(note)).toContain(DRAFT_NOTICE.body);
    // Directly under the h1, before the first section.
    expect(article.querySelector("h1")?.nextElementSibling).toBe(note);
  });

  it("styles the draft notice with the warning tokens, not raw palette colours (design review)", () => {
    const classes = (article.querySelector("[data-legal-draft]")?.getAttribute("class") ?? "").split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(["text-warning", "bg-warning-surface", "border-warning-border"]));
    expect(classes.some((c) => /amber|yellow|orange/.test(c))).toBe(false);
  });

  it("caps every section body at the reading measure (design review)", () => {
    const bodies = [...article.querySelectorAll("section > h2 + div")];
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) expect((body.getAttribute("class") ?? "").split(/\s+/)).toContain("max-w-measure");
  });

  it("carries a robots noindex meta and no canonical", () => {
    const seo = getSeo(path);
    expect(seo.noindex).toBe(true);
    const head = renderHeadTags(seo);
    expect(head).toContain('<meta name="robots" content="noindex, follow" />');
    expect(head).not.toContain('rel="canonical"');
    expect(seo.title).toMatch(/\(Draft\)/);
  });

  it("is left out of the sitemap", () => {
    expect(sitemapPaths).not.toContain(path);
    expect(buildSitemapXml(sitemapPaths, "https://x.test")).not.toContain(`https://x.test${path}<`);
  });

  it("keeps a logical heading order: h1 then h2 sections, no level skipped", () => {
    const levels = [...article.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    expect(levels.length).toBe(doc.sections.length + 1);
    levels.slice(1).forEach((l, i) => expect(l - levels[i]).toBeLessThanOrEqual(1));
  });

  it("prints no unconfirmed config value: no null, no undefined, no email, phone, address or booking link", () => {
    expect(body).not.toMatch(/\bnull\b|\bundefined\b|\[object Object\]/);
    expect(BUSINESS.email).toBeNull();
    expect(article.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull();
    expect(text(article)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(text(article)).not.toContain(BUSINESS.booking.url);
    expect(article.querySelector('a[href*="calendly"]')).toBeNull();
  });

  it("makes no compliance or certification claim and no blanket no-sharing promise", () => {
    expect(text(article)).not.toMatch(COMPLIANCE_CLAIM);
    expect(text(article)).not.toMatch(NEVER_SHARED);
    for (const phrase of LEGAL_FORBIDDEN_PHRASES) expect(text(article)).not.toContain(phrase);
  });

  it("ties every placeholder to a known owner-input id, and renders it visibly", () => {
    const todos = [...documentText(doc).matchAll(OWNER_TODO_PATTERN)];
    expect(todos.length).toBeGreaterThan(0);
    for (const [, , id] of todos) expect(OWNER_INPUT_IDS as readonly string[]).toContain(id);
    // Nothing that looks like a placeholder escapes the pattern (an id typo, a bare "TODO").
    expect(text(article).match(/\[Owner to confirm/g)?.length).toBe(
      [...text(article).matchAll(OWNER_TODO_PATTERN)].length,
    );
    expect(text(article)).not.toMatch(/\bTODO\b|lorem ipsum/i);
    expect(text(article)).toContain("[Owner to confirm: effective date (C23)]");
  });

  it("links only to live routes", () => {
    const live = new Set(getPublicPaths());
    const hrefs = [...article.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect(live.has(h), h).toBe(true);
  });
});

describe("Privacy Policy data-flow facts (REQ-046, C23)", () => {
  const article = text(parse("/privacy").querySelector("main article"));

  it("names every service provider that receives data, and the ones the owner must supply", () => {
    expect(article).toContain("Cloudflare (Cloudflare Pages) hosts and delivers the website.");
    expect(article).toContain("OpenAI receives chat messages");
    expect(article).toContain("[Owner to confirm: email (SMTP) provider name (C23)]");
    expect(article).toContain("[Owner to confirm: server hosting provider name (C23)]");
  });

  it("states what the forms and the chat actually do with data", () => {
    // STS-084 (ADR 0003): leads are now stored in the backend's database before the email is sent.
    expect(article).toMatch(/saves your details in its database, then emails them to our team's inbox/);
    expect(article).not.toMatch(/don't keep form submissions in a database/);
    expect(article).toMatch(/up to the last 10 messages/);
    expect(article).toMatch(/does not save chat messages and does not write them to its logs/);
    expect(article).toMatch(/counts requests from each IP address in its memory/);
  });

  it("states retention as the backend does it: windows, then deletion on a later request (STS-054 review)", () => {
    // BE lib/abuse.ts TtlSet evicts an expired hash at the next claim; lib/rate-limit.ts sweeps
    // ended counters on access, at most every 60 s. No timer deletes anything at the instant it expires.
    expect(article).toMatch(/used for up to 10 minutes to spot a duplicate/);
    expect(article).toMatch(/used for up to 24 hours to limit confirmation emails/);
    expect(article).toMatch(/deleted the next time our server checks a new form submission against these codes/);
    expect(article).toMatch(/deleted during a later form or chat request \(our server clears ended counters at most once a minute\)/);
    expect(article).not.toMatch(/erased when their time window ends/);
    // The contact form now asks how the visitor heard about us, like the audit form (F1, F2).
    expect(article).toMatch(/Contact form: [^.]*how you heard about us/);
    expect(article).toMatch(/Free audit request form: [^.]*how you heard about us/);
  });

  it("states the lead store truthfully: retention, automatic deletion, purpose, staff-only access, erasure (STS-084)", () => {
    expect(article).toContain(
      "We keep each form submission in our server's database for [Owner to confirm: 365 days (C23)]. After that, it is deleted automatically.",
    );
    expect(article).toMatch(/We use the details you send only to answer your inquiry or to prepare your audit\./);
    expect(article).toContain(`Only ${BUSINESS.name} staff can see stored form submissions, through a password-protected admin area`);
    expect(article).toContain("You can ask us to delete your form submission at any time through our contact form.");
    expect(article).toMatch(/delete it from our database and our inbox, through our contact form/);
    // A12-3: the erasure promise names what it does not reach immediately.
    expect(article).toMatch(/We then erase it from our database and our inbox\. Copies in our backups and in our hosting provider's short-term database history are removed when those expire, within \[Owner to confirm: [^\]]+ \(C23\)\]\./);
    expect(article).toMatch(/shows you a reference code for your request/);
    // Chats stay unstored: the lead store is for form submissions only (ADR 0003).
    expect(article).toMatch(/Our server does not save chat messages/);
    expect(article).not.toMatch(/chat[^.]*stored in (its|our) database/i);
  });

  it("says no analytics run today, matching the null GA4 id (C17), and invents no cookie", () => {
    expect(BUSINESS.ga4Id).toBeNull();
    expect(article).toMatch(/don't use Google Analytics or any other analytics/);
    expect(article).toMatch(/does not set cookies/);
    expect(article).not.toMatch(/_ga\b|gtag|Google Tag Manager/);
  });

  it("does not invent a retention period, a legal name, a governing law or a contact email", () => {
    expect(article).toContain("[Owner to confirm: how long form emails are kept (C23)]");
    expect(article).toContain("[Owner to confirm: legal business name and entity type (C1)]");
    expect(article).toContain("[Owner to confirm: privacy contact email (C3)]");
    expect(text(parse("/terms").querySelector("main article"))).toContain(
      "[Owner to confirm: governing state law and the courts for disputes (C23)]",
    );
  });
});

describe("footer links the legal pages on every prerendered page (REQ-046)", () => {
  it.each(["/", "/privacy", "/terms"])("%s", (url) => {
    const footer = parse(url).querySelector("footer") as HTMLElement;
    const legal = footer.querySelector('nav[aria-label="Legal"]') as HTMLElement;
    const hrefs = [...legal.querySelectorAll("a")].map((a) => [text(a), a.getAttribute("href")]);
    expect(hrefs).toEqual([
      ["Privacy Policy", "/privacy"],
      ["Terms of Use", "/terms"],
    ]);
  });
});
