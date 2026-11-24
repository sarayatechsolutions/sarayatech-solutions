import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { act, render } from "@testing-library/react";
import { useState } from "react";
import { motion, MotionProvider } from "./motion";
import { render as prerender, paths } from "@/entry-server";

const Hidden = () => (
  <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
    hello
  </motion.p>
);

describe("content visible on first paint (STS-022)", () => {
  it("renders the final state, not the hidden `initial`, into server HTML", () => {
    const html = renderToString(
      <MotionProvider>
        <Hidden />
      </MotionProvider>,
    );
    expect(html).toContain("hello");
    expect(html).not.toMatch(/opacity:\s*0/);
  });

  it("still animates in components that mount after the app has mounted", async () => {
    let show!: () => void;
    const Late = () => {
      const [on, setOn] = useState(false);
      show = () => setOn(true);
      return on ? <Hidden /> : null;
    };
    const { container } = render(
      <MotionProvider>
        <Late />
      </MotionProvider>,
    );
    await act(async () => show());
    expect(container.querySelector("p")?.getAttribute("style")).toMatch(/opacity:\s*0/);
  });

  it.each(paths)("prerendered HTML for %s has no element hidden at opacity 0", (p) => {
    expect(prerender(p)).not.toMatch(/style="[^"]*opacity:\s*0[;"]/);
  });

  it("has one header, one footer and one main landmark per page", () => {
    for (const p of paths) {
      const html = prerender(p);
      expect((html.match(/<header\b/g) || []).length).toBe(1);
      expect((html.match(/<footer\b/g) || []).length).toBe(1);
      expect((html.match(/<main\b/g) || []).length).toBe(1);
    }
  });
});
