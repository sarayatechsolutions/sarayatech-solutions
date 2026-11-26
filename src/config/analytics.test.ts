import { describe, it, expect } from "vitest";
import { GA4_ID, analyticsConfigured, resolveGa4Id, validGa4Id } from "./analytics";
import { BUSINESS } from "./business";

// STS-050 (C17). Only a well-formed GA4 id can switch analytics on.
describe("GA4 id validation", () => {
  it("ships unset: no id in config, so analytics is off", () => {
    expect(BUSINESS.ga4Id).toBeNull();
    expect(GA4_ID).toBeNull();
    expect(analyticsConfigured()).toBe(false);
  });

  it("accepts G- plus 4 to 12 upper-case letters or digits, trimmed", () => {
    expect(validGa4Id("G-ABCD")).toBe("G-ABCD");
    expect(validGa4Id("G-ABC123XYZ789")).toBe("G-ABC123XYZ789");
    expect(validGa4Id("  G-TEST1234 ")).toBe("G-TEST1234");
  });

  it.each([
    [null],
    [undefined],
    [""],
    [123],
    ["G-ABC"],
    ["G-ABCDEFGHIJKLM"],
    ["g-test1234"],
    ["G-test1234"],
    ["UA-12345-1"],
    ["GTM-ABCD123"],
    ["G-TEST 1234"],
    ['G-TEST1234"><script>'],
    ["G-TEST-1234"],
  ])("treats %j as unset", (raw) => {
    expect(validGa4Id(raw)).toBeNull();
  });

  it("prefers a valid config id, falls back to a valid env id, and ignores invalid ones", () => {
    expect(resolveGa4Id({ config: "G-CONFIG1", env: "G-ENVONE1" })).toBe("G-CONFIG1");
    expect(resolveGa4Id({ config: null, env: "G-ENVONE1" })).toBe("G-ENVONE1");
    expect(resolveGa4Id({ config: "oops", env: "G-ENVONE1" })).toBe("G-ENVONE1");
    expect(resolveGa4Id({ config: null, env: "not-an-id" })).toBeNull();
    expect(resolveGa4Id({})).toBeNull();
    expect(analyticsConfigured("G-TEST1234")).toBe(true);
  });
});
