import { describe, it, expect } from "vitest";
import { BUSINESS } from "@/config/business";
import { getPublicPaths } from "@/routes";
import { SERVICE_PAGES, servicePath } from "@/content/services/services";
import { SITE_URL, getSeo } from "./seo";
import {
  BREADCRUMB_LABELS,
  type SchemaConfig,
  buildJsonLd,
  buildOrganization,
  organizationId,
  renderJsonLd,
  serializeJsonLd,
} from "./structuredData";
import { countOrganizations, findForbiddenSchemaKeys, readJsonLd } from "../../tests/smoke/smoke.mjs";

/** Fictional, fully populated config (555-01xx, example.com). Never copy into the real config. */
const FILLED: SchemaConfig = {
  name: "SarayaTech Solutions",
  phone: { display: "(555) 010-0199", tel: "+15550100199", acceptsTexts: true },
  email: "hello@example.com",
  address: { lines: ["100 Example Street", "Columbus, OH 43000"] },
  areas: ["Columbus, OH"],
  hours: ["Mo-Fr 09:00-17:00", "Mon-Fri 9am-5pm"],
  booking: { url: "https://booking.example.com/x", verified: true },
  social: { linkedin: "https://www.linkedin.com/company/example", twitter: undefined, facebook: "http://insecure.example.com" },
};

const typesOf = (node: Record<string, unknown>) => [node["@type"]].flat();

describe("Organization with today's config (STS-024: verified fields only)", () => {
  const org = buildOrganization();

  it("carries the name, canonical URL, logo and served area, and nothing the owner has not supplied", () => {
    expect(org).toMatchObject({
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: BUSINESS.name,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logo.png`,
      areaServed: [{ "@type": "City", name: "Columbus, OH" }],
    });
    // C2, C3, C4, C6, C19 are open: omitted, not placeholders.
    for (const key of ["telephone", "email", "address", "openingHours", "sameAs", "image"]) {
      expect(org, key).not.toHaveProperty(key);
    }
  });

  it("is not a LocalBusiness while there is no verified street address (service-area mode, C4)", () => {
    expect(typesOf(org)).not.toContain("ProfessionalService");
    expect(typesOf(org)).not.toContain("LocalBusiness");
  });

  it("never has a rating, review, price range, founding date, founder or headcount", () => {
    const json = JSON.stringify(org);
    for (const key of ["aggregateRating", "review", "priceRange", "foundingDate", "founder", "numberOfEmployees", "award"]) {
      expect(json).not.toContain(`"${key}"`);
    }
  });
});

describe("Organization once the owner fills the config", () => {
  const org = buildOrganization(FILLED);

  it("becomes a ProfessionalService with the supplied phone (E.164), email, address and real social links", () => {
    expect(typesOf(org)).toEqual(["Organization", "ProfessionalService"]);
    expect(org.telephone).toBe("+15550100199");
    expect(org.email).toBe("hello@example.com");
    expect(org.address).toEqual({ "@type": "PostalAddress", streetAddress: "100 Example Street, Columbus, OH 43000" });
    // Only https profiles; an undefined or http one is dropped.
    expect(org.sameAs).toEqual(["https://www.linkedin.com/company/example"]);
  });

  it("publishes only opening hours already in schema.org form", () => {
    expect(org.openingHours).toEqual(["Mo-Fr 09:00-17:00"]);
  });

  it("still never carries aggregateRating or review, even with Google reviews configured", () => {
    const withReviews = { ...FILLED, googleReviews: { rating: 5, count: 12, url: "https://g.page/r/example" } };
    expect(JSON.stringify(buildOrganization(withReviews))).not.toMatch(/aggregateRating|"review"|ratingValue/);
  });

  it("drops a phone that is not E.164 instead of publishing it", () => {
    const bad = { ...FILLED, phone: { display: "(555) 010-0199", tel: "555-010-0199" } };
    expect(buildOrganization(bad)).not.toHaveProperty("telephone");
  });
});

describe("JSON-LD per page", () => {
  const paths = getPublicPaths();

  it("puts exactly one Organization on / (with a WebSite) and none on any other page", () => {
    for (const path of paths) {
      const docs = readJsonLd(renderJsonLd(path));
      expect(docs.errors, path).toEqual([]);
      const count = countOrganizations(docs.values);
      expect(count, path).toBe(path === "/" ? 1 : 0);
    }
    const home = buildJsonLd("/")[0] as { "@graph": Record<string, unknown>[] };
    expect(home["@graph"].map((n) => n["@type"])).toEqual(["Organization", "WebSite"]);
  });

  it("gives every inner page a BreadcrumbList from Home, absolute on the canonical host", () => {
    for (const path of paths.filter((p) => p !== "/")) {
      const crumb = buildJsonLd(path).find((d) => d["@type"] === "BreadcrumbList") as
        | { itemListElement: { position: number; name: string; item: string }[] }
        | undefined;
      expect(crumb, path).toBeDefined();
      const items = crumb!.itemListElement;
      expect(items[0]).toMatchObject({ position: 1, name: "Home", item: `${SITE_URL}/` });
      expect(items.at(-1)).toMatchObject({ name: BREADCRUMB_LABELS[path], item: `${SITE_URL}${path}` });
      items.forEach((it, i) => expect(it.position).toBe(i + 1));
    }
  });

  it("nests service pages under Services and adds a Service whose provider is a reference", () => {
    for (const page of SERVICE_PAGES) {
      const path = servicePath(page.slug);
      const docs = buildJsonLd(path);
      const service = docs.find((d) => d["@type"] === "Service") as Record<string, unknown>;
      expect(service, path).toMatchObject({
        name: page.navLabel,
        url: `${SITE_URL}${path}`,
        description: getSeo(path).description,
        provider: { "@id": organizationId(), name: BUSINESS.name },
      });
      expect(Object.keys(service.provider as object).sort()).toEqual(["@id", "@type", "name", "url"]);
      const crumb = docs.find((d) => d["@type"] === "BreadcrumbList") as { itemListElement: { name: string }[] };
      expect(crumb.itemListElement.map((i) => i.name)).toEqual(["Home", "Services", page.navLabel]);
    }
  });

  it("gives noindex pages a breadcrumb at most: no Organization, no Service", () => {
    const noindex = paths.filter((p) => getSeo(p).noindex);
    expect(noindex).toEqual(expect.arrayContaining(["/insights", "/privacy", "/terms"]));
    for (const path of noindex) {
      expect(buildJsonLd(path).map((d) => d["@type"]), path).toEqual(["BreadcrumbList"]);
    }
  });

  it("emits nothing for the 404 page or an unknown URL", () => {
    expect(buildJsonLd("/__not-found__")).toEqual([]);
    expect(renderJsonLd("/no-such-page")).toBe("");
  });

  it("has every key a page needs: @context on each document, no rating anywhere", () => {
    for (const path of paths) {
      const { values } = readJsonLd(renderJsonLd(path));
      for (const v of values) expect((v as Record<string, unknown>)["@context"], path).toBe("https://schema.org");
      expect(findForbiddenSchemaKeys(values), path).toEqual([]);
    }
  });
});

describe("serializeJsonLd: safe inside a <script> element", () => {
  const hostile = { name: '</script><script>alert(1)</script>', note: "<!-- & -->", sep: "a\u2028b\u2029c" };

  it("cannot close the element or open a comment", () => {
    const out = serializeJsonLd(hostile);
    expect(out).not.toMatch(/<\/?script/i);
    expect(out).not.toContain("<!--");
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("is still valid JSON that parses back to the same value", () => {
    expect(JSON.parse(serializeJsonLd(hostile))).toEqual(hostile);
  });

  it("escapes a hostile config value in the rendered page markup", () => {
    const html = renderJsonLd("/", { ...FILLED, name: "Evil</script><img src=x onerror=alert(1)>" });
    // One opening and one closing tag: the value did not break out.
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    const { values, errors } = readJsonLd(html);
    expect(errors).toEqual([]);
    expect(JSON.stringify(values)).toContain("Evil</script><img src=x onerror=alert(1)>");
  });
});
