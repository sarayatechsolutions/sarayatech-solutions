import { describe, it, expect } from "vitest";
import { render } from "@/entry-server";
import { FORM_PRIVACY_NOTE } from "@/content/legal/legal";

// STS-037, REQ-173: the forms' privacy line must agree with /privacy, which names the email
// provider and hosts that receive form details. Read from the prerendered HTML (entry-server).
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const parse = (url: string) => new DOMParser().parseFromString(render(url), "text/html");
const NEVER_SHARED = /never (be )?shared|never share|do not share|don't share your/i;

describe("form privacy copy agrees with /privacy (REQ-173)", () => {
  it.each(["/contact", "/free-audit"])("%s drops the 'never shared' promise and links /privacy next to submit", (url) => {
    const page = parse(url);
    const form = page.querySelector("main form") as HTMLElement;
    expect(text(page.body)).not.toMatch(NEVER_SHARED);
    const note = form.querySelector("[data-form-privacy-note]");
    expect(note).not.toBeNull();
    expect(text(note)).toContain(FORM_PRIVACY_NOTE.text);
    const link = note?.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/privacy");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(text(link ?? null)).toMatch(/opens in a new tab/);
    // Next to the submit button.
    const submit = form.querySelector('button[type="submit"]') as HTMLElement;
    expect(submit.nextElementSibling).toBe(note);
  });
});
