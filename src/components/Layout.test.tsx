import { beforeAll, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "./Layout";

describe("Layout chatbot loading (STS-013)", () => {
  // Flake fix: the first import() of the chatbot module is a cold transform that took
  // >8 s when several vitest runs shared the CPU, so the test measured compile speed,
  // not the deferral. Warm the module cache here (generous hook timeout); the timed
  // assertion below then covers only the idle/timeout deferral and Suspense resolution.
  // Warming does not weaken "not part of first paint": Layout still starts with ready=false.
  beforeAll(async () => {
    await import("@/components/chatbot/AminaChatbot");
  }, 60000);

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
    // Lazily loaded after the idle/timeout fallback (3 s idle timeout at most, then a cached import).
    expect(await screen.findByRole("button", { name: /open chat/i }, { timeout: 8000 })).toBeInTheDocument();
  }, 15000);
});
