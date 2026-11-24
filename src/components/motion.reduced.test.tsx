import { describe, it, expect, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { useState } from "react";

describe("reduced motion (STS-022)", () => {
  it("never starts a late-mounted element hidden when the visitor prefers reduced motion", async () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    const { motion, MotionProvider } = await import("./motion");

    let show!: () => void;
    const Late = () => {
      const [on, setOn] = useState(false);
      show = () => setOn(true);
      return on ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          hi
        </motion.p>
      ) : null;
    };
    const { container } = render(
      <MotionProvider>
        <Late />
      </MotionProvider>,
    );
    await act(async () => show());
    expect(container.querySelector("p")?.getAttribute("style") ?? "").not.toMatch(/opacity:\s*0/);
    // The cold dynamic import of framer-motion takes ~7s when the suite runs in parallel;
    // the default 5s timeout made this test flaky under load.
  }, 30000);
});
