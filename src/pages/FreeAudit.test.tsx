import { describe, it, expect, vi, afterEach } from "vitest";
import { render as rtl, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/entry-server";
import { getSeo } from "@/seo/seo";
import { getPublicPaths } from "@/routes";
import FreeAudit, { WEBSITE_MAX, normalizeWebsite, websiteTooLong } from "./FreeAudit";
import { AUDIT_FORM, AUDIT_HERO } from "@/content/audit/audit";
import { LEAD_SOURCE_INVALID, LEAD_SOURCES } from "@/content/forms/lead-source";
import { buildRoutes } from "../../tests/smoke/smoke.mjs";

// STS-034. The static assertions read the HTML the build prerenders (entry-server); the form
// behaviour is exercised with Testing Library and a mocked fetch.
const html = render("/free-audit");
const doc = new DOMParser().parseFromString(html, "text/html");
const main = doc.querySelector("main") as HTMLElement;
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("free audit page, prerendered (REQ-044)", () => {
  it("is a public route with exactly one h1, the offer name", () => {
    expect(getPublicPaths()).toContain("/free-audit");
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe("Free Website & Google Profile Audit");
    expect(buildRoutes().find((r) => r.path === "/free-audit")?.expectH1).toBe(AUDIT_HERO.headline);
  });

  it("labels every visible control and marks the four required fields", () => {
    for (const id of ["audit-name", "audit-company", "audit-email", "audit-website", "audit-phone", "audit-source", "audit-message"]) {
      expect(main.querySelector(`label[for="${id}"]`), id).not.toBeNull();
      expect(main.querySelector(`#${id}`), id).not.toBeNull();
    }
    const required = [...main.querySelectorAll("input[required]")].map((i) => i.id);
    expect(required.sort()).toEqual(["audit-company", "audit-email", "audit-name", "audit-website"]);
  });

  it("has a honeypot named nickname that is hidden from people and assistive tech", () => {
    const pot = main.querySelector('input[name="nickname"]') as HTMLInputElement;
    expect(pot).not.toBeNull();
    expect(pot.tabIndex).toBe(-1);
    expect(pot.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("offers exactly the five sources, from the list shared with /contact (STS-054)", () => {
    const opts = [...main.querySelectorAll("#audit-source option")].map((o) => o.getAttribute("value"));
    expect(opts).toEqual(["", "google", "referral", "social", "ads", "other"]);
    expect(opts).toEqual(["", ...LEAD_SOURCES]);
    expect(text(main.querySelector("#audit-source option"))).toBe("Choose one (optional)");
  });

  it("ties the source hint by aria-describedby, 44 px tall, on the input border token (STS-041/054)", () => {
    const select = main.querySelector("#audit-source") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.hasAttribute("required")).toBe(false);
    const hint = doc.getElementById(select.getAttribute("aria-describedby") ?? "");
    expect(text(hint)).toBe("This helps us learn how people find us.");
    expect((select.getAttribute("class") ?? "").split(/\s+/)).toEqual(expect.arrayContaining(["h-11", "border-input"]));
  });

  it("promises no reply time and states no price", () => {
    const t = text(main);
    expect(t).not.toMatch(/24 hours|24-48|2 business days|within \d|one business day|\$\s?\d/i);
  });

  it("has its own SEO title (60 chars or fewer) and description", () => {
    const seo = getSeo("/free-audit");
    expect(seo.title.length).toBeLessThanOrEqual(60);
    expect(seo.description).not.toBe(getSeo("/contact").description);
    expect(seo.path).toBe("/free-audit");
  });
});

describe("normalizeWebsite", () => {
  it("prefixes https:// to a bare domain and keeps http(s) URLs", () => {
    expect(normalizeWebsite("example.com")).toBe("https://example.com");
    expect(normalizeWebsite(" http://example.com/x ")).toBe("http://example.com/x");
  });
  it("rejects non-http schemes, spaces and non-domains", () => {
    for (const bad of ["", "ftp://example.com", "javascript:alert(1)", "not a url", "localhost", "https://"]) {
      expect(normalizeWebsite(bad), bad).toBeNull();
    }
  });
  it("matches the backend's 200-character limit, before and after https:// is added (STS-052 D1)", () => {
    const long = `https://example.com/${"a".repeat(230)}`;
    expect(websiteTooLong(long)).toBe(true);
    expect(normalizeWebsite(long)).toBeNull();
    const exact = `https://example.com/${"a".repeat(WEBSITE_MAX - 20)}`;
    expect(exact).toHaveLength(WEBSITE_MAX);
    expect(normalizeWebsite(exact)).toBe(exact);
    // A 195-character bare domain becomes 203 characters once https:// is added.
    const bare = `${"a".repeat(191)}.com`;
    expect(websiteTooLong(bare)).toBe(true);
    expect(normalizeWebsite(bare)).toBeNull();
    expect(WEBSITE_MAX).toBe(200);
  });
  it("rejects credentials in the address, as the backend does", () => {
    expect(normalizeWebsite("https://user:pw@example.com")).toBeNull();
  });
  it("rejects control characters and DEL, as the backend does (A5-4)", () => {
    for (const bad of ["example.com\u0000", "exam\u0007ple.com", "example.com/\u007f", "example.com/a\u001fb"]) {
      expect(normalizeWebsite(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(normalizeWebsite("example.com")).toBe("https://example.com");
  });
});

async function fill(user: ReturnType<typeof userEvent.setup>, website = "example.com") {
  await user.type(screen.getByLabelText(/Your name/), "Ada Lovelace");
  await user.type(screen.getByLabelText(/Business name/), "Ada Bakery");
  await user.type(screen.getByLabelText(/^Email/), "ada@example.com");
  await user.type(screen.getByLabelText(/Website address/), website);
}

describe("free audit form behaviour", () => {
  it("shows required-field errors tied by aria-describedby and sends nothing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    for (const [label, id] of [[/Your name/, "name"], [/Business name/, "company"], [/^Email/, "email"], [/Website address/, "website"]] as const) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.getAttribute("aria-describedby")).toContain(`audit-${id}-error`);
      expect(document.getElementById(`audit-${id}-error`)?.textContent).toBeTruthy();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a bad website address with an inline error", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await fill(user, "not a url");
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    expect(document.getElementById("audit-website-error")?.textContent).toBe(AUDIT_FORM.errors.websiteInvalid);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts exactly the agreed JSON, normalising a bare domain, then announces success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true, message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    // The base is whatever the build was given (CI sets VITE_API_URL for the STS-049 build check).
    expect(url).toBe(`${import.meta.env.VITE_API_URL || ""}/api/contact`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      leadType: "audit",
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Ada Bakery",
      website: "https://example.com",
      nickname: "",
    });
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveTextContent(AUDIT_FORM.success.heading));
  });

  it("includes phone, message and source when given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true, message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await fill(user, "https://example.com");
    await user.type(screen.getByLabelText(/Phone/), "614-555-0100");
    await user.type(screen.getByLabelText(/Anything you/), "Hello");
    await user.selectOptions(screen.getByLabelText(/How did you hear/), "referral");
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      leadType: "audit",
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Ada Bakery",
      website: "https://example.com",
      phone: "614-555-0100",
      message: "Hello",
      source: "referral",
      nickname: "",
    });
  });

  it("never sends a source value injected outside the list, and says why (STS-054)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await fill(user);
    const select = screen.getByLabelText(/How did you hear/) as HTMLSelectElement;
    const injected = document.createElement("option");
    injected.value = "Google";
    injected.textContent = "Google (wrong case)";
    select.appendChild(injected);
    await user.selectOptions(select, "Google");
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveTextContent(LEAD_SOURCE_INVALID));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's message on a 400 in an alert", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(400, { success: false, message: "Website is not reachable." })));
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Website is not reachable.");
  });

  it("shows a generic message on a 500 and keeps what the visitor typed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(500, { success: false, message: "stack trace here" })));
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveTextContent(AUDIT_FORM.failure));
    expect(alert).not.toHaveTextContent("stack trace");
    expect(screen.getByLabelText(/Your name/)).toHaveValue("Ada Lovelace");
  });

  it("disables the submit button while sending", async () => {
    let release: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((r) => (release = r))));
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    const btn = await screen.findByRole("button", { name: AUDIT_FORM.sending });
    expect(btn).toBeDisabled();
    release(json(200, { success: true, message: "ok" }));
    await waitFor(() => expect(screen.getByRole("button", { name: AUDIT_FORM.submit })).toBeEnabled());
  });
});

describe("free audit lead reference (STS-084, ADR 0003)", () => {
  async function submitWith(body: unknown) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, body)));
    const user = userEvent.setup();
    rtl(<FreeAudit />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    const status = screen.getByRole("status");
    await waitFor(() => expect(status).toHaveTextContent(AUDIT_FORM.success.heading));
    return status;
  }

  it("shows the reference inside the status live region, in monospace", async () => {
    const status = await submitWith({ success: true, message: "ok", reference: "REF-7K3QX9PM" });
    const success = status.querySelector("[data-audit-success]") as HTMLElement;
    expect([...success.children].map((c) => c.textContent)).toEqual([
      AUDIT_FORM.success.heading,
      AUDIT_FORM.success.body,
      "Your reference: REF-7K3QX9PM. Mention it if you contact us about this request.",
    ]);
    const note = status.querySelector("[data-lead-reference-note]") as HTMLElement;
    expect(note.tagName).toBe("P");
    expect(note.closest("[data-audit-success]")).not.toBeNull();
    const code = note.querySelector("[data-lead-reference]") as HTMLElement;
    expect(code).toHaveTextContent(/^REF-7K3QX9PM$/);
    expect(code.className.split(/\s+/)).toContain("font-mono");
  });

  it("without a reference the success message is exactly as before", async () => {
    const status = await submitWith({ success: true, message: "ok" });
    expect(status.querySelector("[data-lead-reference-note]")).toBeNull();
    const success = status.querySelector("[data-audit-success]") as HTMLElement;
    expect([...success.children].map((c) => c.textContent)).toEqual([AUDIT_FORM.success.heading, AUDIT_FORM.success.body]);
  });

  it("an invalid or HTML-looking reference is never rendered", async () => {
    const status = await submitWith({ success: true, reference: "<b>REF-7K3QX9PM</b>" });
    expect(status.querySelector("[data-lead-reference-note]")).toBeNull();
    expect(status.querySelector("b")).toBeNull();
    expect(status.textContent).not.toMatch(/REF-/);
  });
});
