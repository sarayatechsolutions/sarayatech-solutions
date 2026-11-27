import { describe, it, expect } from "vitest";
import {
  chosenLeadSource,
  isLeadSource,
  LEAD_SOURCE_FIELD,
  LEAD_SOURCE_OPTIONS,
  LEAD_SOURCES,
} from "./lead-source";

// STS-054 (GAP-09). The backend accepts exactly these values, case-sensitive (BE lib/validation.ts
// SOURCE_OPTIONS). This file pins the frontend half of that contract.
describe("lead source list", () => {
  it("is exactly the five values the backend accepts, in display order", () => {
    expect([...LEAD_SOURCES]).toEqual(["google", "referral", "social", "ads", "other"]);
  });

  it("gives every value one non-empty US-English label, and offers nothing else", () => {
    expect(LEAD_SOURCE_OPTIONS.map((o) => o.value)).toEqual([...LEAD_SOURCES]);
    for (const o of LEAD_SOURCE_OPTIONS) expect(o.label.trim(), o.value).not.toBe("");
    expect(new Set(LEAD_SOURCE_OPTIONS.map((o) => o.label)).size).toBe(LEAD_SOURCES.length);
  });

  it("says the field is optional in the label and in the empty default", () => {
    expect(LEAD_SOURCE_FIELD.label).toMatch(/How did you hear about us\?/);
    expect(LEAD_SOURCE_FIELD.emptyOption).toBe("Choose one (optional)");
  });
});

describe("isLeadSource", () => {
  it.each([...LEAD_SOURCES])("accepts %s", (v) => expect(isLeadSource(v)).toBe(true));

  it.each(["Google", "GOOGLE", " google", "google ", "facebook", "ad", "", "null", null, undefined, 1, {}])(
    "refuses %j",
    (v) => expect(isLeadSource(v)).toBe(false),
  );
});

describe("chosenLeadSource", () => {
  it("adds nothing when no choice was made", () => {
    expect(chosenLeadSource("")).toEqual({});
    expect(chosenLeadSource(undefined)).toEqual({});
    expect(chosenLeadSource(null)).toEqual({});
    expect("source" in chosenLeadSource("")).toBe(false);
  });

  it("passes a choice through as `source`, unvalidated (the submitter validates)", () => {
    expect(chosenLeadSource("social")).toEqual({ source: "social" });
    expect(chosenLeadSource("bogus")).toEqual({ source: "bogus" });
  });
});
