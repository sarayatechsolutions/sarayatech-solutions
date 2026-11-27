import { describe, expect, it } from "vitest";
import { entryBlockers, introSignature } from "../local/shared";
import { INDUSTRY_PAGES, PUBLISHED_INDUSTRIES } from "../industries/industries";
import { areaPath, duplicateIntroSlugs, MIN_INTRO_LENGTH, PUBLISHED_AREAS, publishedAreas, SERVICE_AREAS, type ServiceAreaPage } from "./locations";

const mk = (slug: string, name: string, intro: string, over: Partial<ServiceAreaPage> = {}): ServiceAreaPage => ({
  slug,
  name,
  h1: `Web design in ${name}`,
  metaTitle: `${name} web design`,
  metaDescription: `Description for ${name}.`,
  intro,
  sections: [{ heading: "H", paragraphs: ["P"] }],
  services: ["website-design"],
  ownerConfirmed: true,
  ...over,
});
const own = (s: string) => `${s} unique fixture intro about a pretend project on a pretend street, long enough to clear the minimum length check for tests.`;

describe("service areas and industries ship empty", () => {
  it("publishes nothing until the owner adds entries", () => {
    expect(SERVICE_AREAS).toEqual([]);
    expect(PUBLISHED_AREAS).toEqual([]);
    expect(INDUSTRY_PAGES).toEqual([]);
    expect(PUBLISHED_INDUSTRIES).toEqual([]);
  });

  it("uses the matrix path /locations/<slug>", () => {
    expect(areaPath("hilliard")).toBe("/locations/hilliard");
  });

  it("has no two intros the same in the real list", () => {
    expect(duplicateIntroSlugs(SERVICE_AREAS)).toEqual([]);
  });
});

describe("service area rules (STS-043)", () => {
  it("flags identical and name-swapped intros, and publishes neither", () => {
    const a = mk("a", "Hilliard", own("Hilliard"));
    const b = mk("b", "Dublin", own("Dublin"));
    expect(introSignature(a.intro, a.name)).toBe(introSignature(b.intro, b.name));
    expect(duplicateIntroSlugs([a, b]).sort()).toEqual(["a", "b"]);
    expect(publishedAreas([a, b])).toEqual([]);
    const same = mk("c", "Powell", a.intro);
    expect(duplicateIntroSlugs([a, same]).sort()).toEqual(["a", "c"]);
  });

  it("publishes distinct, confirmed, long-enough intros only", () => {
    const a = mk("a", "Hilliard", own("Hilliard"));
    const b = mk("b", "Dublin", "A different story entirely about a client meeting in Dublin near the river, with enough words to clear the minimum length check here.");
    expect(b.intro.length).toBeGreaterThanOrEqual(MIN_INTRO_LENGTH);
    expect(publishedAreas([a, b]).map((e) => e.slug)).toEqual(["a", "b"]);
    expect(publishedAreas([mk("x", "X", own("X"), { ownerConfirmed: false })])).toEqual([]);
    expect(publishedAreas([mk("y", "Y", "Too short.")])).toEqual([]);
  });

  it("drops an entry with a marker, no section, an unknown service or a bad slug", () => {
    const ok = mk("a", "Hilliard", own("Hilliard"));
    expect(entryBlockers(ok)).toEqual([]);
    expect(entryBlockers({ ...ok, intro: `${ok.intro} [Owner to confirm: fact]` }).length).toBeGreaterThan(0);
    expect(entryBlockers({ ...ok, sections: [] }).length).toBeGreaterThan(0);
    expect(entryBlockers({ ...ok, services: ["nope" as never] }).length).toBeGreaterThan(0);
    expect(entryBlockers({ ...ok, slug: "Bad Slug" }).length).toBeGreaterThan(0);
  });
});
