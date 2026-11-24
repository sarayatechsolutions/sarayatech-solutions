import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRoutes, checkRouteBody, findGoogleFontRefs, findSecretLeaks, firstH1Text } from "./smoke.mjs";
import { getPublicPaths } from "../../src/routes";

// Unit tests for the smoke script's own checks, so the guard is known to have teeth.
describe("smoke secret guard", () => {
  it("flags an OpenAI-style project key and the browser opt-in flag", () => {
    const fakeKey = "sk-proj-" + "A1b2C3d4E5f6G7h8I9j0K1l2";
    expect(findSecretLeaks(`const k="${fakeKey}"`)).toEqual(["OpenAI-style secret key"]);
    expect(findSecretLeaks("new X({dangerouslyAllowBrowser:!0})")).toEqual(["dangerouslyAllowBrowser"]);
  });

  it("does not flag short sk- tokens or words that merely end in 'sk-'", () => {
    expect(findSecretLeaks('class="task-list-item-checkbox-container-wrapper-element"')).toEqual([]);
    expect(findSecretLeaks("sk-short")).toEqual([]);
  });
});

describe("smoke route table", () => {
  it("covers every public route, with one solution and one industry detail", () => {
    const paths = buildRoutes().map((r) => r.path);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of ["/", "/about", "/contact", "/solutions", "/industries", "/realisation", "/insights", "/careers", "/robots.txt"]) {
      expect(paths).toContain(p);
    }
    expect(paths.some((p) => /^\/solutions\/[a-z0-9-]+$/.test(p))).toBe(true);
    expect(paths.some((p) => /^\/industry\/[a-z0-9-]+$/.test(p))).toBe(true);
  });

  it("rejects a non-200, a missing shell and missing expected text", () => {
    const route = { path: "/x", expectText: "<h1>Hello</h1>" };
    expect(checkRouteBody(route, 200, "text/html", '<div id="root"><h1>Hello</h1>')).toEqual([]);
    expect(checkRouteBody(route, 404, "text/html", '<div id="root"><h1>Hello</h1>')).toHaveLength(1);
    expect(checkRouteBody(route, 200, "text/html", "<div><h1>Hello</h1>")).toHaveLength(1);
    expect(checkRouteBody(route, 200, "text/html", '<div id="root">')).toHaveLength(1);
  });
});

describe("smoke h1 assertions (STS-020)", () => {
  it("covers exactly the paths the build prerenders", () => {
    const smoke = buildRoutes().filter((r) => r.expectH1 !== undefined && r.path !== "/404.html").map((r) => r.path);
    expect([...smoke].sort()).toEqual([...getPublicPaths()].sort());
  });

  it("reads the visible h1 text through tags and entities", () => {
    expect(firstH1Text('<h1 class="x">A <span>&amp; B</span><br/>C</h1>')).toBe("A & B C");
    expect(firstH1Text('<div id="root"></div>')).toBeNull();
  });

  it("fails an empty shell and a wrong h1, passes the right one", () => {
    const route = { path: "/x", expectH1: "Hello" };
    expect(checkRouteBody(route, 200, "text/html", '<div id="root"></div>')).toHaveLength(1);
    expect(checkRouteBody(route, 200, "text/html", '<div id="root"><h1>Other</h1>')).toHaveLength(1);
    expect(checkRouteBody(route, 200, "text/html", '<div id="root"><h1 class="x">Hello</h1>')).toEqual([]);
  });
});

describe("smoke first-paint visibility (STS-022)", () => {
  it("fails a section served at inline opacity 0, passes one served visible", () => {
    const route = { path: "/x", expectH1: "Hello" };
    const hidden = '<div id="root"><h1>Hello</h1><section style="opacity:0;transform:translateY(20px)">x</section>';
    const visible = '<div id="root"><h1>Hello</h1><section style="opacity:1">x</section><i class="opacity-0">';
    expect(checkRouteBody(route, 200, "text/html", hidden)).toHaveLength(1);
    expect(checkRouteBody(route, 200, "text/html", visible)).toEqual([]);
  });
});

describe("smoke self-hosted fonts guard (STS-048)", () => {
  it("flags built HTML or CSS that references a Google font host, passes a clean build", () => {
    const dir = mkdtempSync(join(tmpdir(), "fonts-guard-"));
    try {
      writeFileSync(join(dir, "index.html"), '<link rel="preload" as="font" href="/assets/p.woff2">');
      writeFileSync(join(dir, "a.css"), "@font-face{src:url(/assets/p.woff2)}");
      expect(findGoogleFontRefs(dir)).toEqual([]);
      writeFileSync(join(dir, "index.html"), '<link href="https://fonts.googleapis.com/css2?family=Poppins" rel="stylesheet">');
      writeFileSync(join(dir, "a.css"), "@import url(https://fonts.gstatic.com/s/x.woff2);");
      expect(findGoogleFontRefs(dir)).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
