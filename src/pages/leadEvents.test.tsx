import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Contact from "./Contact";
import FreeAudit from "./FreeAudit";
import { AUDIT_FORM } from "@/content/audit/audit";
import { resetAnalyticsForTests, setConsent } from "@/lib/analytics";

// STS-050 (REQ-043): generate_lead fires on a successful submit only, with the form id and the
// fixed lead-source value, and never a field the visitor typed.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const leads = () =>
  (window.dataLayer ?? [])
    .map((a) => Array.from(a as ArrayLike<unknown>))
    .filter((c) => c[0] === "event" && c[1] === "generate_lead");
// Each test types about 70 characters through userEvent (one React render per key), and the first one
// also pays the form's first render. Under a loaded worker pool that passed the 5 s default once
// (verify 2026-11-26), so the budget matches the work instead of the default. No retry.
const FORM_TEST_TIMEOUT_MS = 20_000;
const TYPED = ["Ada Lovelace", "ada@example.com", "614-555-0100", "Ada Bakery", "We need a new website.", "example.com"];

beforeEach(() => {
  window.localStorage.clear();
  resetAnalyticsForTests();
  setConsent("granted", "G-TEST1234"); // the visitor accepted analytics
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  resetAnalyticsForTests();
});

async function fillContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
  await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
  await user.type(screen.getByLabelText(/phone number/i), "614-555-0100");
  await user.type(screen.getByLabelText(/^message/i), "We need a new website.");
}

async function fillAudit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Your name/), "Ada Lovelace");
  await user.type(screen.getByLabelText(/Business name/), "Ada Bakery");
  await user.type(screen.getByLabelText(/^Email/), "ada@example.com");
  await user.type(screen.getByLabelText(/Website address/), "example.com");
  await user.type(screen.getByLabelText(/Phone/), "614-555-0100");
}

describe("contact form", { timeout: FORM_TEST_TIMEOUT_MS }, () => {
  it("success: one generate_lead with form=contact and the chosen lead source, and no typed value", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true })));
    const user = userEvent.setup();
    render(<Contact />);
    await fillContact(user);
    await user.selectOptions(screen.getByLabelText(/How did you hear about us/i), "google");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await screen.findByRole("dialog");
    expect(leads()).toEqual([["event", "generate_lead", { form: "contact", lead_source: "google" }]]);
    const sent = JSON.stringify(window.dataLayer);
    for (const v of TYPED) expect(sent).not.toContain(v);
  });

  it("success with no source chosen: form only", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true })));
    const user = userEvent.setup();
    render(<Contact />);
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await screen.findByRole("dialog");
    expect(leads()).toEqual([["event", "generate_lead", { form: "contact" }]]);
  });

  it("success with a lead reference: the reference is shown, never sent to analytics (STS-084)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true, reference: "REF-7K3QX9PM" })));
    const user = userEvent.setup();
    render(<Contact />);
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("REF-7K3QX9PM");
    expect(leads()).toEqual([["event", "generate_lead", { form: "contact" }]]);
    const sent = JSON.stringify(window.dataLayer);
    expect(sent).not.toContain("REF-7K3QX9PM");
    expect(sent).not.toMatch(/reference/i);
  });

  it("a failed send fires nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(500, { success: false })));
    const user = userEvent.setup();
    render(<Contact />);
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await screen.findByRole("alert");
    expect(leads()).toEqual([]);
  });
});

describe("free audit form", { timeout: FORM_TEST_TIMEOUT_MS }, () => {
  it("success: one generate_lead with form=audit and the chosen lead source, and no typed value", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true, message: "ok" })));
    const user = userEvent.setup();
    render(<FreeAudit />);
    await fillAudit(user);
    await user.selectOptions(screen.getByLabelText(/How did you hear/), "referral");
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(AUDIT_FORM.success.heading));
    expect(leads()).toEqual([["event", "generate_lead", { form: "audit", lead_source: "referral" }]]);
    const sent = JSON.stringify(window.dataLayer);
    for (const v of TYPED) expect(sent).not.toContain(v);
  });

  it("success with a lead reference: the reference is shown, never sent to analytics (STS-084)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true, reference: "REF-7K3QX9PM" })));
    const user = userEvent.setup();
    render(<FreeAudit />);
    await fillAudit(user);
    await user.selectOptions(screen.getByLabelText(/How did you hear/), "google");
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("REF-7K3QX9PM"));
    expect(leads()).toEqual([["event", "generate_lead", { form: "audit", lead_source: "google" }]]);
    const sent = JSON.stringify(window.dataLayer);
    expect(sent).not.toContain("REF-7K3QX9PM");
    expect(sent).not.toMatch(/reference/i);
  });

  it("a failed send fires nothing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(503, { success: false }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<FreeAudit />);
    await fillAudit(user);
    await user.click(screen.getByRole("button", { name: AUDIT_FORM.submit }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await screen.findByRole("alert");
    expect(leads()).toEqual([]);
  });
});
