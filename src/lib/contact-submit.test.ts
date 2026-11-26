import { describe, it, expect, vi } from "vitest";
import {
  CONTACT_MESSAGES,
  LEAD_REFERENCE_PATTERN,
  leadReference,
  submitAudit,
  submitContact,
  type AuditPayload,
  type ContactPayload,
} from "./contact-submit";

// STS-084 (ADR 0003): the lead reference a stored lead's 200 carries. The rest of postLead's
// behaviour is pinned in src/pages/Contact.test.tsx ("submitContact"); these tests add the reference.

const CONTACT: ContactPayload = {
  name: "Ada",
  email: "ada@example.com",
  phone: "",
  company: "",
  service: "Not sure yet",
  message: "Hello",
  nickname: "",
};

const AUDIT: AuditPayload = {
  leadType: "audit",
  name: "Ada",
  email: "ada@example.com",
  company: "Ada Bakery",
  website: "https://example.com",
  nickname: "",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const respond = (status: number, body: unknown) => vi.fn().mockResolvedValue(json(status, body));

describe("lead reference (STS-084)", () => {
  it("returns a well-formed reference from a 200, for both forms", async () => {
    await expect(
      submitContact(CONTACT, { fetchImpl: respond(200, { success: true, message: "ok", reference: "REF-7K3QX9PM" }) }),
    ).resolves.toStrictEqual({ ok: true, reference: "REF-7K3QX9PM" });
    await expect(
      submitAudit(AUDIT, { fetchImpl: respond(200, { success: true, reference: "REF-0123ABCD" }) }),
    ).resolves.toStrictEqual({ ok: true, reference: "REF-0123ABCD" });
  });

  it("accepts every Crockford base32 character and only those", () => {
    for (const c of "0123456789ABCDEFGHJKMNPQRSTVWXYZ") {
      expect(LEAD_REFERENCE_PATTERN.test(`REF-${c.repeat(8)}`), c).toBe(true);
    }
    for (const c of "ILOUilou-_ ./") {
      expect(LEAD_REFERENCE_PATTERN.test(`REF-${c.repeat(8)}`), JSON.stringify(c)).toBe(false);
    }
  });

  it("a 200 without a reference is a plain success, exactly as before (older backend)", async () => {
    const result = await submitContact(CONTACT, { fetchImpl: respond(200, { success: true }) });
    expect(result).toStrictEqual({ ok: true });
    expect("reference" in result).toBe(false);
  });

  const BAD: Array<[string, unknown]> = [
    ["null", null],
    ["a number", 12345678],
    ["an object", { value: "REF-7K3QX9PM" }],
    ["an array", ["REF-7K3QX9PM"]],
    ["a boolean", true],
    ["an empty string", ""],
    ["lower case", "ref-7k3qx9pm"],
    ["a wrong prefix", "REG-7K3QX9PM"],
    ["no dash", "REF7K3QX9PM"],
    ["7 characters", "REF-7K3QX9P"],
    ["9 characters (overlong)", "REF-7K3QX9PMA"],
    ["a very long value", `REF-${"A".repeat(5000)}`],
    ["an excluded letter (I)", "REF-7K3QX9PI"],
    ["an excluded letter (U)", "REF-7K3QX9PU"],
    ["leading space", " REF-7K3QX9PM"],
    ["trailing newline", "REF-7K3QX9PM\n"],
    ["a second line", "REF-7K3QX9PM\nREF-7K3QX9PM"],
    ["HTML", '<img src=x onerror="alert(1)">'],
    ["HTML after a valid code", "REF-7K3QX9PM<script>alert(1)</script>"],
    ["a sentence", "Thanks! Your reference is REF-7K3QX9PM"],
  ];

  it.each(BAD)("treats %s as absent", async (_label, reference) => {
    const result = await submitContact(CONTACT, { fetchImpl: respond(200, { success: true, reference }) });
    expect(result).toStrictEqual({ ok: true });
    expect(leadReference({ reference })).toBeUndefined();
  });

  it("never turns a failure into a success because a reference is present", async () => {
    const withRef = { success: false, message: "Email is invalid", reference: "REF-7K3QX9PM" };
    await expect(submitContact(CONTACT, { fetchImpl: respond(400, withRef) })).resolves.toStrictEqual({
      ok: false,
      kind: "validation",
      message: "Email is invalid",
    });
    await expect(submitContact(CONTACT, { fetchImpl: respond(500, withRef) })).resolves.toStrictEqual({
      ok: false,
      kind: "server",
      message: CONTACT_MESSAGES.server,
    });
    // A 200 that is not success:true stays a failure, reference or not.
    await expect(
      submitContact(CONTACT, { fetchImpl: respond(200, { reference: "REF-7K3QX9PM" }) }),
    ).resolves.toStrictEqual({ ok: false, kind: "server", message: CONTACT_MESSAGES.server });
  });

  it("does not read a reference from a body that is not JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"success":true,"reference":"REF-7K3QX9PM"}', {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );
    await expect(submitContact(CONTACT, { fetchImpl })).resolves.toStrictEqual({
      ok: false,
      kind: "server",
      message: CONTACT_MESSAGES.server,
    });
  });

  it("leadReference ignores anything that is not an object with a reference", () => {
    for (const body of [undefined, null, "REF-7K3QX9PM", 1, [], {}]) {
      expect(leadReference(body), JSON.stringify(body)).toBeUndefined();
    }
  });
});
