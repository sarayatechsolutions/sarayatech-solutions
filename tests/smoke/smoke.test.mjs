import { describe, it, expect } from "vitest";
import { buildRoutes, checkRouteBody, findSecretLeaks, firstH1Text } from "./smoke.mjs";
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
    expect(checkRouteBody(route, 200, "text/html", '<div id="root"><h1 style="opacity:0">Hello</h1>')).toEqual([]);
  });
});
