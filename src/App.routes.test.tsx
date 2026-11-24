import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

describe("App routing (STS-016: dead admin routes)", () => {
  it("does not route /auth to the admin login page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // NotFound logs the miss
    renderAt("/auth");
    expect(await screen.findByText("Oops! Page not found")).toBeInTheDocument();
    expect(screen.queryByText("Connexion Admin")).not.toBeInTheDocument();
  });

  it("does not route /dashboard to the dashboard page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderAt("/dashboard");
    expect(await screen.findByText("Oops! Page not found")).toBeInTheDocument();
  });

  it("still routes a public page", async () => {
    renderAt("/contact");
    expect(screen.queryByText("Oops! Page not found")).not.toBeInTheDocument();
    expect(await screen.findAllByText(/info@sarayatech\.com/i)).not.toHaveLength(0);
  });
});
