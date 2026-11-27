import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Contact, { type ContactConfig } from "./Contact";
import { CONTACT_MESSAGES, submitAudit, submitContact, type ContactPayload } from "@/lib/contact-submit";
import { LEAD_SOURCE_INVALID, LEAD_SOURCES, type LeadSource } from "@/content/forms/lead-source";
import { render as renderStatic } from "@/entry-server";
import { SERVICE_INTERESTS, SERVICE_INTEREST_UNSURE } from "@/content/forms/service-interest";
import { CONTACT_FORM } from "@/content/forms/contact-form";

// Design audit B6: the success dialog became a panel that replaces the form, inside an always-mounted
// role="status" region; its heading takes focus (FF-1).
const SUCCESS_HEADING = CONTACT_FORM.success.heading;
const successPanel = async () => {
  await screen.findByRole("heading", { name: SUCCESS_HEADING });
  return screen.getByRole("status");
};

const PAYLOAD: ContactPayload = {
  name: "Ada",
  email: "ada@example.com",
  phone: "",
  company: "",
  service: SERVICE_INTEREST_UNSURE,
  message: "Hello",
  nickname: "",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function html(status: number): Response {
  return new Response("<!doctype html><title>502 Bad Gateway</title>", {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitContact", () => {
  it("succeeds only on 2xx JSON with success:true, posting exactly the agreed fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { success: true }));
    await expect(submitContact(PAYLOAD, { apiUrl: "", fetchImpl })).resolves.toEqual({ ok: true });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(Object.keys(JSON.parse(init.body)).sort()).toEqual(
      ["company", "email", "message", "name", "nickname", "phone", "service"],
    );
  });

  it("treats a 200 HTML page as a failure, not a success or a parser error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("<!doctype html><p>ok</p>", { status: 200, headers: { "Content-Type": "text/html" } }),
    );
    await expect(submitContact(PAYLOAD, { fetchImpl })).resolves.toEqual({
      ok: false,
      kind: "server",
      message: CONTACT_MESSAGES.server,
    });
  });

  it("does not parse a body whose content-type is not JSON, even if it looks like success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"success":true}', { status: 200, headers: { "Content-Type": "text/html" } }),
    );
    const result = await submitContact(PAYLOAD, { fetchImpl });
    expect(result).toEqual({ ok: false, kind: "server", message: CONTACT_MESSAGES.server });
  });

  it("treats a 502 HTML page as a server failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(html(502));
    const result = await submitContact(PAYLOAD, { fetchImpl });
    expect(result).toEqual({ ok: false, kind: "server", message: CONTACT_MESSAGES.server });
  });

  it("shows the server's short validation message on 400", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(400, { success: false, message: "Email is invalid" }));
    await expect(submitContact(PAYLOAD, { fetchImpl })).resolves.toEqual({
      ok: false,
      kind: "validation",
      message: "Email is invalid",
    });
  });

  it("falls back to a generic message on a 400 without a usable message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(400, { success: false, message: "x".repeat(500) }));
    const result = await submitContact(PAYLOAD, { fetchImpl });
    expect(result).toEqual({ ok: false, kind: "validation", message: CONTACT_MESSAGES.validation });
  });

  it("maps 429 to the rate-limit message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(429, { success: false, message: "slow down" }));
    const result = await submitContact(PAYLOAD, { fetchImpl });
    expect(result).toEqual({
      ok: false,
      kind: "rate_limited",
      message: "Too many requests, please try again in a few minutes.",
    });
  });

  it("posts `source` when one of the five values is given (STS-054)", async () => {
    for (const source of LEAD_SOURCES) {
      const fetchImpl = vi.fn().mockResolvedValue(json(200, { success: true }));
      await expect(submitContact({ ...PAYLOAD, source }, { fetchImpl })).resolves.toEqual({ ok: true });
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body).source).toBe(source);
    }
  });

  it("refuses a source outside the list before any request, with the backend's wording (STS-054)", async () => {
    for (const bad of ["Google", "facebook", ""]) {
      const fetchImpl = vi.fn();
      const contact = await submitContact({ ...PAYLOAD, source: bad as LeadSource }, { fetchImpl });
      expect(contact, bad).toEqual({ ok: false, kind: "validation", message: LEAD_SOURCE_INVALID });
      const audit = await submitAudit(
        { leadType: "audit", name: "Ada", email: "ada@example.com", company: "Ada", website: "https://a.example", nickname: "", source: bad as LeadSource },
        { fetchImpl },
      );
      expect(audit, bad).toEqual({ ok: false, kind: "validation", message: LEAD_SOURCE_INVALID });
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("maps a network error to a connection message", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await submitContact(PAYLOAD, { fetchImpl });
    expect(result).toEqual({ ok: false, kind: "network", message: CONTACT_MESSAGES.network });
  });
});

describe("Contact page", () => {
  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^message/i), "We need a new website.");
    await user.click(screen.getByRole("button", { name: /send message/i }));
  }

  it("the Service Interest select offers exactly the shared constant, required, defaulting to the not-sure option", () => {
    const { container } = render(<Contact />);
    const native = container.querySelector('select[aria-hidden="true"], select[name="service"]') as HTMLSelectElement | null;
    expect(native).not.toBeNull();
    const values = Array.from(native!.options).map((o) => o.value).filter((v) => v !== "");
    expect(values).toEqual([...SERVICE_INTERESTS]);
    expect(native!.value).toBe(SERVICE_INTEREST_UNSURE);
    expect(native).toBeRequired();
    expect(values).not.toContain("General Inquiry");
    expect(values).not.toContain("Web & Mobile Development");
  });

  it("labels every visible field and caps its length", () => {
    render(<Contact />);
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute("maxLength", "254");
    expect(screen.getByLabelText(/phone number/i)).toHaveAttribute("maxLength", "30");
    expect(screen.getByLabelText(/^company/i)).toHaveAttribute("maxLength", "120");
    expect(screen.getByLabelText(/^message/i)).toHaveAttribute("maxLength", "5000");
  });

  it("keeps the honeypot out of the tab order and the accessibility tree", () => {
    const { container } = render(<Contact />);
    const honeypot = container.querySelector<HTMLInputElement>("input[name='nickname']");
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabIndex", "-1");
    expect(honeypot).toHaveAttribute("autoComplete", "off");
    expect(honeypot?.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("announces a 429 with the rate-limit text and no unverified booking link (STS-030)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(429, { success: false })));
    render(<Contact />);
    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Too many requests, please try again in a few minutes.");
    // C15 is unverified, so the alert must not link to the booking page.
    expect(screen.queryByRole("link", { name: /book a call/i })).not.toBeInTheDocument();
    expect(alert.querySelector("a")).toBeNull();
    expect(alert.closest("[aria-live]")).not.toBeNull();
    expect(screen.queryByText(SUCCESS_HEADING)).not.toBeInTheDocument();
  });

  it("never reports success for an HTML error page", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(html(502)));
    render(<Contact />);
    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(CONTACT_MESSAGES.server);
    expect(screen.queryByText(SUCCESS_HEADING)).not.toBeInTheDocument();
    expect(screen.queryByText(/unexpected token/i)).not.toBeInTheDocument();
  });

  it("replaces the form with the success panel, announced and focused (B6, FF-1)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true })));
    const { container } = render(<Contact />);
    await fillAndSubmit(user);

    const status = await successPanel();
    const heading = screen.getByRole("heading", { name: SUCCESS_HEADING });
    expect(status).toContainElement(heading);
    expect(heading).toHaveFocus();
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(within(status).getByRole("link", { name: "See our work" })).toHaveAttribute("href", "/our-work");
    expect(within(status).getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });

  it("sends one request even if submit is triggered twice", async () => {
    const user = userEvent.setup();
    let resolve!: (r: Response) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<Contact />);
    await fillAndSubmit(user);

    // A second submit while the first is in flight (Enter key, double click).
    container.querySelector("form")!.requestSubmit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();

    resolve(json(200, { success: true }));
    await waitFor(() => expect(screen.getByText(SUCCESS_HEADING)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// Test-only values (555 numbers, example.com): they stand in for facts the owner has not supplied.
const POPULATED: ContactConfig = {
  name: "SarayaTech Solutions",
  serviceAreaText: "Serving Columbus, OH and central Ohio",
  phone: { display: "(555) 010-0199", tel: "+15550100199" },
  email: "hello@example.com",
  address: {
    lines: ["100 Example Street", "Columbus, OH 00000"],
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=example",
  },
  hours: ["Monday to Friday, 9am to 5pm"],
  booking: { url: "https://calendly.com/example-booking", verified: true },
  social: null,
};

describe("Contact page content (STS-044, GAP-03)", () => {
  it("default config: service area and the form, with no unconfirmed contact facts or reply-time promise", () => {
    const { container } = render(<Contact />);
    const html = container.innerHTML;
    const text = container.textContent ?? "";

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Let's talk about your business");
    expect(screen.getByText("Service area")).toBeInTheDocument();
    expect(screen.getByText("Serving Columbus, OH and central Ohio")).toBeInTheDocument();

    expect(container.querySelector("form")).not.toBeNull();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();

    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(html).not.toMatch(/calendly/i);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("address")).toBeNull();
    expect(screen.queryByRole("link", { name: /book a free consultation/i })).not.toBeInTheDocument();
    expect(text).not.toMatch(/Business Hours/);

    // C16 / I-12: no response time is promised until the owner confirms one.
    expect(text).not.toMatch(/24 hours|24-48|48 hours|business day/i);
    expect(text).toMatch(/We'll reply as soon as we can\./);
  });

  it("form fields carry no placeholder that reads like a filled-in person", () => {
    render(<Contact />);
    expect(screen.getByLabelText(/full name/i)).not.toHaveAttribute("placeholder");
    expect(screen.getByLabelText(/^email/i)).not.toHaveAttribute("placeholder");
    expect(screen.queryByDisplayValue(/john/i)).not.toBeInTheDocument();
  });

  it("populated config: phone, email, booking, address, hours and a titled map render", () => {
    const { container } = render(<Contact config={POPULATED} />);

    const tel = screen.getByRole("link", { name: "(555) 010-0199" });
    expect(tel).toHaveAttribute("href", "tel:+15550100199");

    const mail = screen.getByRole("link", { name: "hello@example.com" });
    expect(mail).toHaveAttribute("href", "mailto:hello@example.com");

    const book = screen.getByRole("link", { name: /book a free consultation/i });
    expect(book).toHaveAttribute("href", "https://calendly.com/example-booking");
    expect(book).toHaveAttribute("target", "_blank");
    expect(book).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(book).toHaveAccessibleName(/opens in a new tab/i);

    const address = container.querySelector("address");
    expect(address).toHaveTextContent("100 Example Street");
    expect(address).toHaveTextContent("Columbus, OH 00000");
    expect(screen.queryByText("Service area")).not.toBeInTheDocument();

    expect(screen.getByText("Business Hours")).toBeInTheDocument();
    expect(screen.getByText("Monday to Friday, 9am to 5pm")).toBeInTheDocument();

    const map = container.querySelector("iframe");
    expect(map).toHaveAttribute("src", "https://www.google.com/maps/embed?pb=example");
    expect(map).toHaveAttribute("title", expect.stringMatching(/map/i));

    // The form stays on the page alongside every other channel.
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("an unverified booking URL is never linked, even when everything else is set (C15)", () => {
    const cfg: ContactConfig = { ...POPULATED, booking: { ...POPULATED.booking, verified: false } };
    const { container } = render(<Contact config={cfg} />);
    expect(screen.queryByRole("link", { name: /book a free consultation/i })).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/calendly/i);
  });

  it("no map without a map URL, and no map without a confirmed address (C4)", () => {
    const noMapUrl: ContactConfig = { ...POPULATED, address: { lines: POPULATED.address!.lines } };
    const first = render(<Contact config={noMapUrl} />);
    expect(first.container.querySelector("address")).not.toBeNull();
    expect(first.container.querySelector("iframe")).toBeNull();
    first.unmount();

    const noAddress: ContactConfig = { ...POPULATED, address: null };
    const second = render(<Contact config={noAddress} />);
    expect(second.container.querySelector("iframe")).toBeNull();
    expect(screen.getByText("Serving Columbus, OH and central Ohio")).toBeInTheDocument();
  });

  it("a failed send offers the verified booking link inside the announced alert", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(429, { success: false })));
    render(<Contact config={POPULATED} />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^message/i), "We need a new website.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.closest("[aria-live]")).not.toBeNull();
    expect(alert.querySelector("a")).toHaveAttribute("href", "https://calendly.com/example-booking");
  });

  it("the success panel promises no response time", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true })));
    render(<Contact />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^message/i), "We need a new website.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const panel = await successPanel();
    expect(panel).toHaveTextContent(SUCCESS_HEADING);
    expect(panel.textContent).not.toMatch(/24|48|hours|business day/i);
  });
});

describe("Contact page lead source (STS-054, GAP-09)", () => {
  const sourceSelect = () => screen.getByLabelText(/How did you hear about us/i) as HTMLSelectElement;

  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^message/i), "We need a new website.");
  }

  // Design audit B6: 48 px (h-12), up from 44 px (h-11), like every control.
  it("is a labelled, optional native select with a hint, 48 px tall, on the input border token (B6)", () => {
    render(<Contact />);
    const select = sourceSelect();
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveAttribute("name", "source");
    expect(select).not.toBeRequired();
    expect(select).toHaveValue("");
    expect(select).toHaveAccessibleDescription("This helps us learn how people find us.");
    expect(select.className.split(/\s+/)).toEqual(expect.arrayContaining(["h-12", "border", "border-input"]));
    expect(select.options[0]).toHaveTextContent("Choose one (optional)");
  });

  it("offers only the empty default and the five agreed values, in the prerendered HTML too", () => {
    render(<Contact />);
    expect([...sourceSelect().options].map((o) => o.value)).toEqual(["", ...LEAD_SOURCES]);

    const doc = new DOMParser().parseFromString(renderStatic("/contact"), "text/html");
    const options = [...doc.querySelectorAll("main #contact-source option")].map((o) => o.getAttribute("value"));
    expect(options).toEqual(["", ...LEAD_SOURCES]);
    expect(doc.querySelector('main label[for="contact-source"]')?.textContent).toMatch(/How did you hear about us/);
  });

  it("omits `source` from the payload when nothing is chosen", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Contact />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(["company", "email", "message", "name", "nickname", "phone", "service"]);
  });

  it("includes `source` when chosen, and the success panel then replaces the form", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Contact />);
    await fill(user);
    await user.selectOptions(sourceSelect(), "social");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "",
      company: "",
      service: SERVICE_INTEREST_UNSURE,
      message: "We need a new website.",
      source: "social",
      nickname: "",
    });
    // B6: the form (and so the choice) is gone once sent; the panel stands in its place.
    expect(await screen.findByText(SUCCESS_HEADING)).toBeInTheDocument();
    expect(screen.queryByLabelText(/How did you hear about us/i)).not.toBeInTheDocument();
  });

  it("a value injected into the select is refused in the page's alert and never sent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Contact />);
    await fill(user);
    const injected = document.createElement("option");
    injected.value = "facebook";
    injected.textContent = "Facebook";
    sourceSelect().appendChild(injected);
    await user.selectOptions(sourceSelect(), "facebook");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(LEAD_SOURCE_INVALID);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Contact page lead reference (STS-084, ADR 0003)", () => {
  // B6: the panel's text block (heading, body, reference) carries data-contact-success.
  const SUCCESS_BODY = `${CONTACT_FORM.success.body} We'll reply as soon as we can.`;

  async function submitWith(body: unknown) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, body)));
    const user = userEvent.setup();
    render(<Contact />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^message/i), "We need a new website.");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    const status = await successPanel();
    return status.querySelector("[data-contact-success]") as HTMLElement;
  }

  it("shows the reference inside the status live region, in monospace, with a copy button", async () => {
    const text = await submitWith({ success: true, message: "ok", reference: "REF-7K3QX9PM" });
    expect([...text.children].map((c) => c.textContent)).toEqual([
      SUCCESS_HEADING,
      SUCCESS_BODY,
      "Your reference: REF-7K3QX9PM. Mention it if you contact us about this request.",
    ]);
    const code = text.querySelector("[data-lead-reference]") as HTMLElement;
    expect(code).toHaveTextContent(/^REF-7K3QX9PM$/);
    expect(code.className.split(/\s+/)).toContain("font-mono");
    // Text, not colour, carries the meaning: the label sits right next to the code.
    expect(code.closest("[data-lead-reference-note]")).toHaveTextContent(/^Your reference: REF-7K3QX9PM\./);
    expect(screen.getByRole("button", { name: "Copy reference" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("copies the reference and says so in a polite live region", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const text = await submitWith({ success: true, reference: "REF-7K3QX9PM" });
    // userEvent.setup() installs its own clipboard stub, so ours goes in after it.
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    try {
      await user.click(screen.getByRole("button", { name: "Copy reference" }));
      expect(writeText).toHaveBeenCalledWith("REF-7K3QX9PM");
      const said = text.querySelector("[data-copy-status]") as HTMLElement;
      expect(said).toHaveAttribute("aria-live", "polite");
      await waitFor(() => expect(said).toHaveTextContent("Copied"));
    } finally {
      // @ts-expect-error test cleanup of the stub
      delete navigator.clipboard;
    }
  });

  it("without a reference the panel says only the heading and the body", async () => {
    const text = await submitWith({ success: true, message: "ok" });
    expect([...text.children].map((c) => c.textContent)).toEqual([SUCCESS_HEADING, SUCCESS_BODY]);
    expect(text.querySelector("[data-lead-reference-note]")).toBeNull();
    expect(text.textContent).not.toMatch(/reference/i);
  });

  it("an invalid or HTML-looking reference is never rendered", async () => {
    const text = await submitWith({ success: true, reference: '<img src=x onerror="alert(1)">REF-7K3QX9PM' });
    expect([...text.children].map((c) => c.textContent)).toEqual([SUCCESS_HEADING, SUCCESS_BODY]);
    expect(text.querySelector("[data-lead-reference-note]")).toBeNull();
    expect(document.querySelector("[data-form-success] img")).toBeNull();
    expect(text.textContent).not.toMatch(/onerror|REF-/);
  });
});

// Design audit B6: inline validation, FF-1 (error focus) and FF-10 (context from the query string).
describe("Contact form system (design audit B6, FF-1, FF-10)", () => {
  const serviceSelect = () => document.querySelector('select[name="service"]') as HTMLSelectElement;
  const at = (url: string) => window.history.replaceState({}, "", url);
  afterEach(() => at("/"));

  it("an empty submit shows inline errors tied by aria-describedby, focuses the first field, and sends nothing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Contact />);
    await user.click(screen.getByRole("button", { name: /send message/i }));
    for (const [id, message] of [
      ["name", CONTACT_FORM.errors.name],
      ["email", CONTACT_FORM.errors.emailRequired],
      ["message", CONTACT_FORM.errors.message],
    ] as const) {
      const field = document.getElementById(`contact-${id}`) as HTMLElement;
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field.getAttribute("aria-describedby")).toContain(`contact-${id}-error`);
      expect(document.getElementById(`contact-${id}-error`)).toHaveTextContent(message);
    }
    expect(document.getElementById("contact-name")).toHaveFocus();
    // One summary for assistive tech, not a visible box on top of the inline errors.
    expect(screen.getByRole("alert")).toHaveTextContent(CONTACT_FORM.errors.summary);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed email inline and focuses it", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Contact />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@");
    await user.type(screen.getByLabelText(/^message/i), "Hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(document.getElementById("contact-email-error")).toHaveTextContent(CONTACT_FORM.errors.emailInvalid);
    expect(document.getElementById("contact-email")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("FF-1: a failed send is announced next to the button, takes focus, and keeps what was typed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(500, { success: false, message: "stack trace here" })));
    const user = userEvent.setup();
    render(<Contact />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^message/i), "We need a new website.");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).not.toHaveTextContent("stack trace");
    expect(alert.parentElement).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText(/^message/i)).toHaveValue("We need a new website.");
  });

  it("the service select is a 48 px native select with a visible label", () => {
    render(<Contact />);
    expect(serviceSelect().className.split(/\s+/)).toEqual(expect.arrayContaining(["h-12", "appearance-none"]));
    expect(screen.getByLabelText(/service interest/i)).toBe(serviceSelect());
  });

  it("FF-10: ?service=<slug> preselects that service", async () => {
    at("/contact?service=local-seo");
    render(<Contact />);
    await waitFor(() => expect(serviceSelect()).toHaveValue("Local SEO"));
    expect(screen.getByLabelText(/^message/i)).toHaveValue("");
  });

  it("FF-10: ?package=<id> opens an editable message naming the package, and it is sent as typed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true }));
    vi.stubGlobal("fetch", fetchMock);
    at("/contact?package=local-growth");
    const user = userEvent.setup();
    render(<Contact />);
    const message = screen.getByLabelText(/^message/i);
    await waitFor(() => expect(message).toHaveValue("I'd like a quote for the Local Growth package."));
    expect(serviceSelect()).toHaveValue(SERVICE_INTEREST_UNSURE);
    await user.type(message, " Two locations.");
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.message).toBe("I'd like a quote for the Local Growth package. Two locations.");
    expect(sent.service).toBe(SERVICE_INTEREST_UNSURE);
    // The query parameter itself is never part of the request.
    expect(JSON.stringify(sent)).not.toContain("local-growth");
  });

  it.each([
    "/contact?service=unknown",
    "/contact?service=Local-SEO",
    "/contact?service=local-seo&service=paid-ads",
    "/contact?package=enterprise",
    "/contact?service=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
  ])("FF-10 deny: %s is ignored and the form keeps its defaults", async (url) => {
    at(url);
    render(<Contact />);
    // Give the mount effect its turn, then check nothing moved.
    await waitFor(() => expect(serviceSelect()).toHaveValue(SERVICE_INTEREST_UNSURE));
    expect(screen.getByLabelText(/^message/i)).toHaveValue("");
    expect(document.body.innerHTML).not.toMatch(/onerror|enterprise|Local-SEO/);
  });
});
