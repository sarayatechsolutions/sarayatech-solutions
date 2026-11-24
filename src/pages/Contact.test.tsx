import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Contact, { type ContactConfig } from "./Contact";
import { CONTACT_MESSAGES, submitContact, type ContactPayload } from "@/lib/contact-submit";

const PAYLOAD: ContactPayload = {
  name: "Ada",
  email: "ada@example.com",
  phone: "",
  company: "",
  service: "General Inquiry",
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
    expect(screen.queryByText(/message sent successfully/i)).not.toBeInTheDocument();
  });

  it("never reports success for an HTML error page", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(html(502)));
    render(<Contact />);
    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(CONTACT_MESSAGES.server);
    expect(screen.queryByText(/message sent successfully/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unexpected token/i)).not.toBeInTheDocument();
  });

  it("shows the success dialog on success", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true })));
    render(<Contact />);
    await fillAndSubmit(user);

    expect(await screen.findByText(/message sent successfully/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument());
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

  it("the success dialog promises no response time", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { success: true })));
    render(<Contact />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^message/i), "We need a new website.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/message sent successfully/i);
    expect(dialog.textContent).not.toMatch(/24|48|hours|business day/i);
  });
});
