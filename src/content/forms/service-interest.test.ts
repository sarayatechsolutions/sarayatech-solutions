import { describe, it, expect } from "vitest";
import { SERVICE_INTERESTS, SERVICE_INTEREST_UNSURE } from "./service-interest";
import { SERVICE_PAGES } from "@/content/services/services";

describe("service interest list (wire contract with BE lib/validation.ts SERVICE_OPTIONS)", () => {
  it("is pinned: update the backend SERVICE_OPTIONS in the same change if this fails", () => {
    expect([...SERVICE_INTERESTS]).toEqual([
      "Website Design",
      "App Development",
      "Local SEO",
      "Social Media",
      "Paid Ads",
      "Not sure yet / Something else",
    ]);
  });

  it("covers every service page plus the not-sure option, with no duplicates", () => {
    for (const p of SERVICE_PAGES) expect(SERVICE_INTERESTS).toContain(p.navLabel);
    expect(SERVICE_INTERESTS).toContain(SERVICE_INTEREST_UNSURE);
    expect(new Set(SERVICE_INTERESTS).size).toBe(SERVICE_INTERESTS.length);
  });
});
