import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { NOT_FOUND } from "@/content/not-found/not-found";

// Design audit B7: the 404 heading changed from "Oops! Page not found" (section 5 copy).
const NOT_FOUND_HEADING = NOT_FOUND.heading;

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

describe("App routing (STS-016: dead admin routes)", () => {
  it("does not route /auth to the admin login page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // NotFound logs the miss
    renderAt("/auth");
    expect(await screen.findByText(NOT_FOUND_HEADING)).toBeInTheDocument();
    expect(screen.queryByText("Connexion Admin")).not.toBeInTheDocument();
  });

  it("does not route /dashboard to the dashboard page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderAt("/dashboard");
    expect(await screen.findByText(NOT_FOUND_HEADING)).toBeInTheDocument();
  });

  it("still routes a public page", async () => {
    renderAt("/contact");
    expect(screen.queryByText(NOT_FOUND_HEADING)).not.toBeInTheDocument();
    // The contact block renders from the business config (STS-030): service area, no email.
    expect(await screen.findAllByText("Serving Columbus, OH and central Ohio")).not.toHaveLength(0);
    expect(screen.queryByText(/info@sarayatech\.com/i)).not.toBeInTheDocument();
  });
});
