import { describe, it, expect } from "vitest";
import { isInternalHref } from "./links";

describe("isInternalHref", () => {
  it("allows root-relative app paths", () => {
    for (const href of ["/", "/solutions", "/solutions/ai-automation-chatbots", "/contact?x=1#top"]) {
      expect(isInternalHref(href)).toBe(true);
    }
  });

  it("denies protocol-relative, backslash, absolute and empty hrefs", () => {
    const backslash = "/" + String.fromCharCode(92) + "evil.example";
    for (const href of ["//evil.example", backslash, "https://calendly.com/saraya-info", "mailto:a@b.c", "solutions", "", undefined, null]) {
      expect(isInternalHref(href)).toBe(false);
    }
  });
});
