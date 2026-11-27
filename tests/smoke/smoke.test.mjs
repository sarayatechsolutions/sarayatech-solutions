import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOME_FORBIDDEN_PHRASES, checkJsonLd, countOrganizations, findForbiddenSchemaKeys, readJsonLd, SITEWIDE_FORBIDDEN_PHRASES, buildRoutes, checkRedirectsBuild, findForbiddenInHtml, checkRouteBody, checkSeoHead, findDuplicateSeo, findGoogleFontRefs, findSecretLeaks, firstH1Text, sitemapLocs } from "./smoke.mjs";
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
  it("covers every public route, and no retired one (STS-039, STS-057)", () => {
    const paths = buildRoutes().map((r) => r.path);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of ["/", "/about", "/contact", "/services", "/our-work", "/insights", "/careers", "/robots.txt"]) {
      expect(paths).toContain(p);
    }
    expect(paths.filter((p) => /^\/(solutions|industries|industry|realisation)(\/|$)/.test(p))).toEqual([]);
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

describe("smoke forbidden home phrases (STS-031)", () => {
  it("fails a page that contains a banned phrase, passes one without", () => {
    const route = { path: "/x", forbidText: ["Digital Transformation"] };
    expect(checkRouteBody(route, 200, "text/html", '<div id="root"><h1>Your Partner for Digital Transformation</h1>')).toHaveLength(1);
    expect(checkRouteBody(route, 200, "text/html", '<div id="root"><h1>We build your website.</h1>')).toEqual([]);
  });

  it("guards the home route with the source's banned phrases", () => {
    const home = buildRoutes().find((r) => r.path === "/");
    expect(home?.forbidText).toBe(HOME_FORBIDDEN_PHRASES);
    expect(HOME_FORBIDDEN_PHRASES).toEqual(
      expect.arrayContaining(["Enterprise-grade", "Enterprise Technology Solutions", "Digital Transformation", "Transform your business"]),
    );
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

describe("smoke SEO assertions (STS-021)", () => {
  const good = (t = "T", d = "D", c = "https://x.test/a") =>
    `<html><head><title>${t}</title><meta name="description" content="${d}" /><link rel="canonical" href="${c}" /></head><body></body></html>`;

  it("passes a page with one title, a description and the right canonical", () => {
    expect(checkSeoHead(good(), "https://x.test/a")).toEqual([]);
  });

  it("fails the generic-shell cases: missing, duplicated, empty or off-host", () => {
    expect(checkSeoHead("<head></head>", "https://x.test/a")).toHaveLength(3);
    expect(checkSeoHead(good().replace("<head>", "<head><title>Two</title>"), "https://x.test/a")[0]).toMatch(/exactly one <title>/);
    expect(checkSeoHead(good("T", ""), "https://x.test/a")[0]).toMatch(/empty meta description/);
    expect(checkSeoHead(good("T", "D", "https://x.test/b"), "https://x.test/a")[0]).toMatch(/is not/);
    expect(checkSeoHead(good("T", "D", "https://x.test/a/"), "https://x.test/a")).toHaveLength(1);
  });

  it("flags duplicate titles and descriptions across pages", () => {
    expect(findDuplicateSeo([{ path: "/a", title: "t1", description: "d1" }, { path: "/b", title: "t2", description: "d2" }])).toEqual([]);
    expect(findDuplicateSeo([{ path: "/a", title: "t", description: "d1" }, { path: "/b", title: "t", description: "d2" }])).toHaveLength(1);
  });

  it("reads sitemap locs", () => {
    expect(sitemapLocs("<urlset><url><loc>https://x.test/</loc></url><url><loc>https://x.test/a</loc></url></urlset>")).toEqual(["https://x.test/", "https://x.test/a"]);
  });
});

describe("smoke built-redirects guard (STS-039)", () => {
  /** A throwaway dist/ with the given pages ("/" or "/a/b") and _redirects text. */
  function fakeDist(pages, redirects) {
    const dir = mkdtempSync(join(tmpdir(), "redirects-guard-"));
    for (const p of pages) {
      const d = join(dir, ...p.split("/").filter(Boolean));
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, "index.html"), "<h1>x</h1>");
    }
    if (redirects !== null) writeFileSync(join(dir, "_redirects"), redirects);
    return dir;
  }

  it("passes 301s from unbuilt sources to built targets", () => {
    const dir = fakeDist(["/", "/services"], "/solutions /services 301\n/industry/* /services 301\n");
    try {
      expect(checkRedirectsBuild(dir).failures).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails a missing file, a 302, a source that is still built and a target that is not", () => {
    const missing = fakeDist(["/"], null);
    const bad = fakeDist(["/", "/solutions"], "/solutions /services 301\n/old / 302\n");
    try {
      expect(checkRedirectsBuild(missing).failures).toHaveLength(1);
      const failures = checkRedirectsBuild(bad).failures.join("\n");
      expect(failures).toMatch(/\/solutions is still a built page/);
      expect(failures).toMatch(/target \/services is not a built page/);
      expect(failures).toMatch(/\/old is a 302/);
    } finally {
      rmSync(missing, { recursive: true, force: true });
      rmSync(bad, { recursive: true, force: true });
    }
  });

  it("accepts the real public/_redirects against the real route list, and fails if /realisation is still built (STS-057)", () => {
    const real = readFileSync(join(process.cwd(), "public", "_redirects"), "utf8");
    expect(real).toMatch(/^\/realisation\s+\/our-work\s+301\s*$/m);
    const good = fakeDist(getPublicPaths(), real);
    const stale = fakeDist([...getPublicPaths(), "/realisation"], real);
    try {
      expect(checkRedirectsBuild(good).failures).toEqual([]);
      expect(checkRedirectsBuild(stale).failures.join("\n")).toMatch(/\/realisation is still a built page/);
    } finally {
      rmSync(good, { recursive: true, force: true });
      rmSync(stale, { recursive: true, force: true });
    }
  });
});

describe("smoke sitewide REQ-011 phrase guard (STS-039)", () => {
  it("finds the banned phrases in any built HTML file, whatever the case", () => {
    expect(SITEWIDE_FORBIDDEN_PHRASES).toEqual(["Enterprise-grade", "Enterprise Technology Solutions"]);
    const dir = mkdtempSync(join(tmpdir(), "phrase-guard-"));
    try {
      mkdirSync(join(dir, "industry", "enterprise"), { recursive: true });
      writeFileSync(join(dir, "index.html"), "<h1>We build your website.</h1>");
      writeFileSync(join(dir, "industry", "enterprise", "index.html"), "<p>enterprise-grade solutions</p>");
      const hits = findForbiddenInHtml(dir);
      expect(hits).toHaveLength(1);
      expect(hits[0].phrase).toBe("Enterprise-grade");
      expect(hits[0].file).toMatch(/enterprise[\\/]index\.html$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("smoke JSON-LD assertions (STS-024)", () => {
  const ld = (obj) => `<script type="application/ld+json" data-seo-jsonld>${JSON.stringify(obj)}</script>`;
  const ctx = "https://schema.org";
  const org = { "@context": ctx, "@graph": [{ "@type": "Organization", name: "X" }, { "@type": "WebSite", name: "X" }] };
  const crumb = { "@context": ctx, "@type": "BreadcrumbList", itemListElement: [] };
  const service = { "@context": ctx, "@type": "Service", provider: { "@type": "Organization", "@id": "x" } };

  it("passes the home page with exactly one Organization", () => {
    expect(checkJsonLd({ path: "/" }, `<head>${ld(org)}</head>`)).toEqual([]);
  });

  it("fails the home page with no Organization, or with two", () => {
    expect(checkJsonLd({ path: "/" }, "<head></head>").join()).toMatch(/exactly one Organization.*found 0/);
    expect(checkJsonLd({ path: "/" }, `<head>${ld(org)}${ld({ "@context": ctx, "@type": "ProfessionalService" })}</head>`).join()).toMatch(/found 2/);
  });

  it("fails a block that is not valid JSON", () => {
    const html = `<head><script type="application/ld+json">{"@type": "Organization",}</script></head>`;
    expect(checkJsonLd({ path: "/" }, html).join()).toMatch(/not valid JSON/);
  });

  it("fails a rating or review at any depth", () => {
    const rated = { ...org, "@graph": [{ ...org["@graph"][0], aggregateRating: { ratingValue: 5 } }] };
    expect(checkJsonLd({ path: "/" }, ld(rated)).join()).toMatch(/aggregateRating/);
    expect(findForbiddenSchemaKeys([{ a: [{ review: [] }] }])).toEqual(["review"]);
  });

  it("counts a Service provider reference as no Organization declaration", () => {
    expect(countOrganizations([service])).toBe(0);
    expect(checkJsonLd({ path: "/services/paid-ads", expectH1: "x" }, ld(service) + ld(crumb))).toEqual([]);
  });

  it("fails a service page without its Service, and an inner page without a breadcrumb", () => {
    expect(checkJsonLd({ path: "/services/paid-ads", expectH1: "x" }, ld(crumb)).join()).toMatch(/exactly one Service/);
    expect(checkJsonLd({ path: "/about", expectH1: "x" }, "").join()).toMatch(/BreadcrumbList/);
  });

  it("fails an Organization on an inner page and anything but a breadcrumb on a noindex page", () => {
    expect(checkJsonLd({ path: "/about", expectH1: "x" }, ld(org) + ld(crumb)).join()).toMatch(/no Organization declaration/);
    expect(checkJsonLd({ path: "/insights", expectH1: "x", noindex: true }, ld(crumb))).toEqual([]);
    expect(checkJsonLd({ path: "/insights", expectH1: "x", noindex: true }, ld(crumb) + ld(service)).join()).toMatch(/BreadcrumbList at most/);
  });

  it("fails JSON-LD on the 404 page", () => {
    expect(checkJsonLd({ path: "/404.html", expectH1: "404" }, ld(crumb)).join()).toMatch(/404 page must carry no JSON-LD/);
  });

  it("reads escaped JSON-LD back to the original value", () => {
    const html = `<script type="application/ld+json">{"name":"a\\u003c/script\\u003eb"}</script>`;
    expect(readJsonLd(html)).toEqual({ values: [{ name: "a</script>b" }], errors: [], count: 1 });
  });
});
