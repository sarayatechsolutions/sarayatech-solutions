import { describe, expect, it } from "vitest";
import { APP_ROUTES, getPublicPaths } from "@/routes";
import {
  findPlaceholders,
  isPublishable,
  linkTargets,
  parseInline,
  postLinkTarget,
  publishBlockers,
  publishedPosts,
  type BlogPost,
} from "./blog";
import { PUBLISHED_POSTS } from "./posts";
import { POST_SOURCES } from "./postSources";

const base = (over: Partial<BlogPost> = {}): BlogPost => ({
  slug: "a-post",
  title: "A Post",
  metaTitle: "A Post Meta Title",
  description: "A description.",
  date: "2026-01-02",
  author: { name: "SarayaTech Solutions" },
  topic: "t",
  intro: [{ kind: "p", text: "Intro." }],
  sections: [{ heading: "H", blocks: [{ kind: "p", text: "Body." }] }],
  approved: true,
  ownerReview: [],
  ...over,
});

describe("publishing rules", () => {
  it("accepts a complete approved post", () => {
    expect(publishBlockers(base())).toEqual([]);
    expect(isPublishable(base())).toBe(true);
  });

  it("blocks an unapproved post", () => {
    expect(publishBlockers(base({ approved: false }))).toContain("not approved");
  });

  it.each([
    ["body paragraph", { sections: [{ heading: "H", blocks: [{ kind: "p" as const, text: "Costs [Owner to confirm: price] a month" }] }] }],
    ["list item", { intro: [{ kind: "ul" as const, items: ["[Owner to confirm: x]"] }] }],
    ["table cell", { intro: [{ kind: "table" as const, header: ["a"], rows: [["[owner to confirm]"]] }] }],
    ["heading", { sections: [{ heading: "[Owner to confirm: h]", blocks: [] }] }],
    ["title", { title: "Title [Owner to confirm]" }],
    ["description", { description: "Desc [Owner to confirm: x]" }],
    ["legacy OWNER marker", { intro: [{ kind: "p" as const, text: "[OWNER: fill in]" }] }],
    ["legacy VERIFY marker", { intro: [{ kind: "p" as const, text: "see [VERIFY LINK]" }] }],
  ])("an approved post with a marker in its %s can never be published", (_n, over) => {
    const p = base(over as Partial<BlogPost>);
    expect(findPlaceholders(p).length).toBeGreaterThan(0);
    expect(isPublishable(p)).toBe(false);
    expect(publishedPosts([p])).toEqual([]);
  });

  it("blocks an owner callout, a bad slug and a bad date", () => {
    expect(isPublishable(base({ intro: [{ kind: "callout", text: "note" }] }))).toBe(false);
    expect(isPublishable(base({ slug: "Bad Slug" }))).toBe(false);
    expect(isPublishable(base({ date: "" }))).toBe(false);
    expect(isPublishable(base({ date: "June 1" }))).toBe(false);
  });

  it("does not look at ownerReview notes", () => {
    expect(isPublishable(base({ ownerReview: ["[OWNER: fill in]", "[VERIFY LINK]"] }))).toBe(true);
  });

  it("keeps the first of two equal slugs and sorts newest first", () => {
    const a = base({ slug: "a", date: "2026-01-01" });
    const b = base({ slug: "b", date: "2026-03-01" });
    const dup = base({ slug: "a", date: "2026-05-01", title: "dup" });
    expect(publishedPosts([a, b, dup, null, undefined]).map((p) => p.slug)).toEqual(["b", "a"]);
  });
});

describe("link targets (security addendum 7, A7-2)", () => {
  const BS = String.fromCharCode(92); // a literal backslash, kept out of string escapes
  const withLink = (href: string) =>
    base({ sections: [{ heading: "H", blocks: [{ kind: "p", text: `See [this](${href}).` }] }] });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert%281%29",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "//evil.example/x",
    `/${BS}evil.example`,
    `${BS}${BS}evil.example`,
    "/.//evil.example",
    "http://example.com",
    "mailto:a@example.com",
    "tel:+15555550100",
    "services",
    "#top",
  ])("an approved post linking to %j can never be published", (href) => {
    const p = withLink(href);
    expect(postLinkTarget(href)).toEqual({ kind: "text" });
    expect(publishBlockers(p).some((b) => b.startsWith("link target is not an internal path or an https URL"))).toBe(true);
    expect(isPublishable(p)).toBe(false);
    expect(publishedPosts([p])).toEqual([]);
  });

  // A8-1: the gate must read links exactly as the renderer does (parseInline). Each of these texts
  // once looked internal or link-free to a separate regex while PostBody parsed a bad href out of it.
  it.each([
    ["](/ok[a](javascript:alert)", "javascript:alert"],
    ["](/ok[a](vbscript:x)", "vbscript:x"],
    ["](/services[a](//evil.example)", "//evil.example"],
    ["](/ok[a](data:text/html,x)", "data:text/html,x"],
    ["](/free-audit#[a](http://example.com)", "http://example.com"],
  ])("refuses %j, whose rendered link target is %j", (text, rendered) => {
    const p = base({ sections: [{ heading: "H", blocks: [{ kind: "p", text }] }] });
    expect(parseInline(text).filter((n) => n.type === "link").map((n) => (n.type === "link" ? n.href : ""))).toContain(rendered);
    expect(linkTargets(p)).toContain(rendered);
    expect(publishBlockers(p)).toContain(`link target is not an internal path or an https URL: ${rendered}`);
    expect(isPublishable(p)).toBe(false);
  });

  it("sees the same href as the renderer when the outer bracket is the link", () => {
    const text = "[x](/ok[a](javascript:alert)";
    const p = base({ sections: [{ heading: "H", blocks: [{ kind: "p", text }] }] });
    const rendered = parseInline(text).flatMap((n) => (n.type === "link" ? [n.href] : []));
    expect(rendered).toEqual(["/ok[a](javascript:alert"]);
    expect(linkTargets(p)).toEqual(rendered);
    expect(postLinkTarget(rendered[0]).kind).toBe("internal");
  });

  it("checks link targets in every place a link can be written, headings and callouts included", () => {
    const bad = "[x](javascript:void0)";
    const places: Partial<BlogPost>[] = [
      { intro: [{ kind: "p", text: bad }] },
      { intro: [{ kind: "ol", items: [bad] }] },
      { intro: [{ kind: "table", header: [bad], rows: [] }] },
      { intro: [{ kind: "h3", text: bad }] },
      { sections: [{ heading: bad, blocks: [] }] },
    ];
    for (const over of places) {
      const p = base(over);
      expect(linkTargets(p), JSON.stringify(over)).toEqual(["javascript:void0"]);
      expect(isPublishable(p), JSON.stringify(over)).toBe(false);
    }
    expect(linkTargets(base({ intro: [{ kind: "callout", text: bad }] }))).toEqual(["javascript:void0"]);
  });

  it("flags a bad target in a list item and a table cell too", () => {
    expect(isPublishable(base({ intro: [{ kind: "ul", items: ["[x](javascript:void0)"] }] }))).toBe(false);
    expect(isPublishable(base({ intro: [{ kind: "table", header: ["a"], rows: [["[x](//evil.example)"]] }] }))).toBe(false);
  });

  it.each([
    ["/services", { kind: "internal", href: "/services" }],
    ["/free-audit#book", { kind: "internal", href: "/free-audit#book" }],
    ["https://example.com/guide", { kind: "external", href: "https://example.com/guide" }],
    ["HTTPS://Example.com", { kind: "external", href: "https://example.com/" }],
  ])("allows %j and the post stays publishable", (href, expected) => {
    expect(postLinkTarget(href)).toEqual(expected);
    expect(publishBlockers(withLink(href))).toEqual([]);
  });
});

describe("parseInline", () => {
  it("splits links, bold and italic, and leaves other text alone", () => {
    expect(parseInline("a [x](/free-audit) **b** *c* <b>d</b>")).toEqual([
      { type: "text", text: "a " },
      { type: "link", text: "x", href: "/free-audit" },
      { type: "text", text: " " },
      { type: "strong", text: "b" },
      { type: "text", text: " " },
      { type: "em", text: "c" },
      { type: "text", text: " <b>d</b>" },
    ]);
  });
});

describe("the five shipped drafts", () => {
  const staticPaths = new Set(getPublicPaths());

  it("are all unapproved, so none is public today", () => {
    expect(POST_SOURCES).toHaveLength(5);
    for (const p of POST_SOURCES) expect(p.approved, p.slug).toBe(false);
    expect(PUBLISHED_POSTS).toEqual([]);
    expect(APP_ROUTES.some((r) => r.path === "/insights/:slug")).toBe(false);
    expect(getPublicPaths().some((p) => p.startsWith("/insights/"))).toBe(false);
  });

  it("keep their [Owner to confirm ...] placeholders, so approving one unedited still cannot publish it", () => {
    const withMarkers = POST_SOURCES.filter((p) => findPlaceholders(p).length > 0);
    expect(withMarkers.length).toBeGreaterThan(0);
    for (const p of withMarkers) expect(isPublishable({ ...p, approved: true, date: "2026-12-01" })).toBe(false);
  });

  it("have unique slugs, a sound meta title and description, and links to real routes", () => {
    const slugs = POST_SOURCES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of POST_SOURCES) {
      expect(p.metaTitle.length, p.slug).toBeGreaterThanOrEqual(35);
      expect(p.metaTitle.length, p.slug).toBeLessThanOrEqual(60);
      expect(p.description.length, p.slug).toBeGreaterThanOrEqual(100);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(160);
      expect(p.description, p.slug).not.toBe(p.title);
      for (const href of linkTargets(p)) {
        expect(postLinkTarget(href).kind, `${p.slug} -> ${href}`).not.toBe("text");
        if (href.startsWith("/")) expect(staticPaths.has(href.split("#")[0]), `${p.slug} -> ${href}`).toBe(true);
      }
    }
  });
});
