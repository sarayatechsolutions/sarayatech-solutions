import { describe, expect, it } from "vitest";
import { assertApiUrl, validateApiUrl } from "../tools/require-api-url.ts";

describe("validateApiUrl", () => {
  it("rejects missing, empty and blank", () => {
    expect(validateApiUrl(undefined)).toMatch(/VITE_API_URL is not set/);
    expect(validateApiUrl("")).toMatch(/VITE_API_URL is not set/);
    expect(validateApiUrl("   ")).toMatch(/not set/);
  });
  it("rejects non-https remote URLs and relative paths", () => {
    expect(validateApiUrl("http://example.com")).toMatch(/absolute https/);
    expect(validateApiUrl("/api")).toMatch(/absolute https/);
    expect(validateApiUrl("https://")).toMatch(/absolute https/);
  });
  it("accepts https and localhost", () => {
    expect(validateApiUrl("https://api.example.com")).toBeNull();
    expect(validateApiUrl("http://localhost:3001")).toBeNull();
    expect(validateApiUrl("http://127.0.0.1:3001")).toBeNull();
  });
  it("rejects a localhost lookalike host", () => {
    expect(validateApiUrl("http://localhost.evil.com")).toMatch(/absolute https/);
  });
});

describe("assertApiUrl", () => {
  it("throws on a production build without the variable and names it", () => {
    expect(() => assertApiUrl("build", "production", {})).toThrow(/VITE_API_URL/);
    expect(() => assertApiUrl("build", "production", {})).toThrow(/Cloudflare Pages/);
  });
  it("does not echo other env values", () => {
    expect(() =>
      assertApiUrl("build", "production", { VITE_API_URL: "http://example.com", SECRET: "s3cr3t" }),
    ).toThrow(/^(?!.*s3cr3t)/s);
  });
  it("does not apply to dev server, tests or non-production modes", () => {
    expect(() => assertApiUrl("serve", "development", {})).not.toThrow();
    expect(() => assertApiUrl("serve", "production", {})).not.toThrow();
    expect(() => assertApiUrl("build", "development", {})).not.toThrow();
    expect(() => assertApiUrl("build", "test", {})).not.toThrow();
  });
  it("passes a valid production build", () => {
    expect(() => assertApiUrl("build", "production", { VITE_API_URL: "https://api.example.com" })).not.toThrow();
  });
});
