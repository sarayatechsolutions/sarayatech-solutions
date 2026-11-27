import { describe, it, expect } from "vitest";
import { classifyHref, isInternalHref } from "./links";

const BS = String.fromCharCode(92); // a literal backslash, kept out of string escapes

describe("classifyHref: internal (STS-058 / SEC-16)", () => {
  it.each([
    ["/", "/"],
    ["/contact", "/contact"],
    ["/solutions/ai-automation-chatbots", "/solutions/ai-automation-chatbots"],
    ["/contact?x=1#top", "/contact?x=1#top"],
  ])("routes the same-origin path %j internally as %j", (href, expected) => {
    expect(classifyHref(href)).toEqual({ kind: "internal", href: expected });
    expect(isInternalHref(href)).toBe(true);
  });
});

describe("classifyHref: external", () => {
  it.each([
    ["//evil.tld", "https://evil.tld/"],
    ["//evil.tld/contact", "https://evil.tld/contact"],
    [`/${BS}evil.tld`, "https://evil.tld/"],
    [`${BS}${BS}evil.tld`, "https://evil.tld/"],
    ["https://x", "https://x/"],
    ["HTTPS://Example.com/a?b=1", "https://example.com/a?b=1"],
    ["http://example.com", "http://example.com/"],
  ])("treats %j as an external link to %j, never an internal route", (href, expected) => {
    expect(classifyHref(href)).toEqual({ kind: "external", href: expected });
    expect(isInternalHref(href)).toBe(false);
  });
});

describe("classifyHref: plain text, not a link", () => {
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<b>x</b>",
    "vbscript:msgbox(1)",
    "mailto:a@b.c",
    "tel:+15550100",
    "file:///etc/passwd",
    "ftp://example.com",
    "solutions",
    "#top",
    "",
    " /contact",
    "/\t/evil.tld",
    "/\n/evil.tld",
    " //evil.tld",
    "https://",
    undefined,
    null,
  ])("renders %j as text", (href) => {
    expect(classifyHref(href)).toEqual({ kind: "text" });
    expect(isInternalHref(href)).toBe(false);
  });
});

// Security review integrate/s2 (MEDIUM): a single leading slash followed by dot segments passed
// the "starts with exactly one slash" test, then normalised to "//evil.example", a
// protocol-relative href to another host. A dot-segment off-site link is never legitimate,
// so it is plain text, not an internal route and not an external link either.
describe("classifyHref: dot-segment paths that normalise to another host", () => {
  it.each([
    "/.//evil.example",
    "/..//evil.example",
    "/a/..//evil.example",
    "/%2e//evil.example",
    "/%2E//evil.example",
    "/%2e%2e//evil.example",
    "/%2E%2E//evil.example",
    "/././/evil.example",
    "/a/b/../..//evil.example",
    `/./${BS}evil.example`,
    `/../${BS}evil.example`,
    `/.${BS}${BS}evil.example`,
  ])("renders %j as text, never as an internal route", (href) => {
    expect(classifyHref(href)).toEqual({ kind: "text" });
    expect(isInternalHref(href)).toBe(false);
  });

  it.each([
    ["/./contact", "/contact"],
    ["/solutions/../contact", "/contact"],
    ["/%2e/contact", "/contact"],
  ])("still routes the harmless dot-segment path %j internally as %j", (href, expected) => {
    expect(classifyHref(href)).toEqual({ kind: "internal", href: expected });
  });
});
