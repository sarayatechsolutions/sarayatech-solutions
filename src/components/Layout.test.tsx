import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "./Layout";

describe("Layout chatbot loading (STS-013)", () => {
  it("renders the page without the chatbot, then mounts it once idle", async () => {
    render(
      <MemoryRouter>
        <Layout>
          <p>page body</p>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByText("page body")).toBeInTheDocument();
    // Not part of first paint.
    expect(screen.queryByRole("button", { name: /open chat/i })).not.toBeInTheDocument();
    // Lazily loaded after the idle/timeout fallback.
    expect(await screen.findByRole("button", { name: /open chat/i }, { timeout: 8000 })).toBeInTheDocument();
  }, 15000);
});
