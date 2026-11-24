import { describe, it, expect } from "vitest";
import { inject, outputFile } from "../tools/prerender.mjs";

describe("prerender script", () => {
  it("maps URL paths to dist files", () => {
    expect(outputFile("/")).toBe("index.html");
    expect(outputFile("/about")).toBe("about/index.html");
    expect(outputFile("/solutions/web-mobile-development")).toBe("solutions/web-mobile-development/index.html");
    expect(outputFile("/careers/")).toBe("careers/index.html");
  });

  it("injects markup into the empty root, keeping the rest of the shell", () => {
    const out = inject('<head></head><body><div id="root"></div><script src="/a.js"></script></body>', "<h1>Hi $& there</h1>");
    expect(out).toBe('<head></head><body><div id="root"><h1>Hi $& there</h1></div><script src="/a.js"></script></body>');
  });

  it("fails loudly when the shell has no empty root", () => {
    expect(() => inject('<div id="root"><p>x</p></div>', "<h1>x</h1>")).toThrow(/no <div id="root">/);
  });
});
