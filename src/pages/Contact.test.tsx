import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Contact from "./Contact";
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
