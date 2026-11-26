import { afterEach, describe, expect, it, vi } from "vitest";
import { inject } from "../../tools/prerender.mjs";
import {
  checkJsonLd,
  checkRouteBody,
  checkSeoHead,
  countOrganizations,
  findForbiddenSchemaKeys,
  gatedRoutesFromSitemap,
  readJsonLd,
  sitemapLocs,
} from "../../tests/smoke/smoke.mjs";
import type { BlogPost } from "@/content/insights/blog";
import type { IndustryPage } from "@/content/industries/industries";
import type { ServiceAreaPage } from "@/content/locations/locations";

// Every test calls load(), which resets the module graph and re-imports @/routes (every page),
// SEO and the SSR entry inside the test body. That cold transform alone took 5.0-5.6 s on a loaded
// run, over vitest's 5 s default, so the timeout is raised for this file only. No assertion changes.
vi.setConfig({ testTimeout: 30_000 });

/**
 * End-to-end proof of the owner gate for STS-055 (blog), STS-042 (industries) and STS-043 (service
 * areas). Each scenario swaps the content list for a fixture (vi.doMock) and loads the REAL routes,
 * SEO layer, JSON-LD and server renderer on top of it, then reads the result as the build would:
 *   fixture entries -> routes, prerender list, sitemap, head tags, JSON-LD, rendered HTML;
 *   empty or unapproved -> none of those exist and the URL is the 404 page.
 * The fixtures are obviously fake test text, never site copy.
 */

const SITE = "https://sarayatechsolutions.com";

const post = (over: Partial<BlogPost> = {}): BlogPost => ({
  slug: "fixture-guide-one",
  title: "Fixture Guide One: A Test Article",
  metaTitle: "Fixture Guide One for Test Readers Only",
  description: "A fixture description that is long enough for the search snippet rules, used only by the owner-gate tests and never on the site.",
  date: "2026-06-01",
  author: { name: "SarayaTech Solutions" },
  topic: "fixture topic",
  intro: [{ kind: "p", text: "Fixture intro with a [service link](/services/website-design) and **bold** text." }],
  sections: [
    {
      heading: "Fixture section",
      blocks: [
        { kind: "ul", items: ["First fixture item", "Second fixture item"] },
        { kind: "table", header: ["Col A", "Col B"], rows: [["a1", "b1"]] },
        { kind: "p", text: "Ask for a [free audit](/free-audit) or read [more guides](/insights)." },
      ],
    },
  ],
  approved: true,
  ownerReview: ["fixture"],
  ...over,
});

const entry = (over: Partial<IndustryPage> = {}): IndustryPage => ({
  slug: "fixture-bakery",
  name: "Fixture Bakeries",
  h1: "Websites for Fixture Bakeries",
  metaTitle: "Fixture Bakery Websites in Columbus | SarayaTech",
  metaDescription: "Fixture meta description for the owner-gate tests: how a local bakery gets found and booked, supplied by the test, not the owner.",
  intro: "Fixture intro written by the test for the Fixture Bakeries page, describing only what the entry itself supplies.",
  sections: [{ heading: "Fixture section heading", paragraphs: ["Fixture paragraph one.", "Fixture paragraph two."] }],
  services: ["website-design", "local-seo"],
  ...over,
});

const area = (over: Partial<ServiceAreaPage> = {}): ServiceAreaPage => ({
  ...entry({
    slug: "fixture-hilliard",
    name: "Fixture Hilliard",
    h1: "Web Design for Fixture Hilliard Businesses",
    metaTitle: "Fixture Hilliard Web Design | SarayaTech",
    metaDescription: "Fixture meta description for the Fixture Hilliard service-area page, written by the test to prove the owner gate and nothing else.",
    intro: "Fixture Hilliard intro: a unique paragraph about a pretend project on a pretend street, long enough to pass the minimum length check.",
  }),
  ownerConfirmed: true,
  ...over,
});

type Mods = {
  routes: typeof import("@/routes");
  seo: typeof import("@/seo/seo");
  ld: typeof import("@/seo/structuredData");
  server: typeof import("@/entry-server");
};

/** Loads the real site modules on top of fixture content lists. */
async function load(fixtures: { posts?: BlogPost[]; industries?: IndustryPage[]; areas?: ServiceAreaPage[] }): Promise<Mods> {
  vi.resetModules();
  vi.doMock("@/content/insights/posts", async () => {
    const blog = await vi.importActual<typeof import("@/content/insights/blog")>("@/content/insights/blog");
    const posts = fixtures.posts ?? [];
    return { POST_MODULES: posts, PUBLISHED_POSTS: blog.publishedPosts(posts) };
  });
  vi.doMock("@/content/industries/industries", async () => {
    const actual = await vi.importActual<typeof import("@/content/industries/industries")>("@/content/industries/industries");
    return { ...actual, INDUSTRY_PAGES: fixtures.industries ?? [], PUBLISHED_INDUSTRIES: actual.publishedIndustries(fixtures.industries ?? []) };
  });
  vi.doMock("@/content/locations/locations", async () => {
    const actual = await vi.importActual<typeof import("@/content/locations/locations")>("@/content/locations/locations");
    return { ...actual, SERVICE_AREAS: fixtures.areas ?? [], PUBLISHED_AREAS: actual.publishedAreas(fixtures.areas ?? []) };
  });
  return {
    routes: await import("@/routes"),
    seo: await import("@/seo/seo"),
    ld: await import("@/seo/structuredData"),
    server: await import("@/entry-server"),
  };
}

afterEach(() => {
  vi.doUnmock("@/content/insights/posts");
  vi.doUnmock("@/content/industries/industries");
  vi.doUnmock("@/content/locations/locations");
});

const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

/** The page exactly as tools/prerender.mjs writes it: shell + rendered body + head tags + JSON-LD. */
function prerendered(m: Mods, path: string): string {
  const shell = '<html><head><title>x</title></head><body><div id="root"></div></body></html>';
  const head = [m.seo.renderHeadTags(m.seo.getSeo(path)), m.ld.renderJsonLd(path)].filter(Boolean).join("\n");
  return inject(shell, m.server.render(path), head);
}

const staticPaths = async () => (await load({})).routes.getPublicPaths();

describe("STS-055 blog: approved fixture posts", () => {
  const good = post();
  const placeholder = post({
    slug: "fixture-placeholder",
    title: "Fixture With A Placeholder",
    metaTitle: "Fixture With A Placeholder For Tests Only",
    description: "Another fixture description that is long enough for the search snippet rules, used by the owner-gate tests only, never on the site.",
    sections: [{ heading: "Price", blocks: [{ kind: "p", text: "From [Owner to confirm: price, C8] a month." }] }],
  });
  const unapproved = post({ slug: "fixture-unapproved", title: "Fixture Unapproved Draft", approved: false });

  it("routes, prerenders and lists in the sitemap only the approved, placeholder-free post", async () => {
    const m = await load({ posts: [good, placeholder, unapproved] });
    const paths = m.routes.getPublicPaths();
    expect(paths).toContain("/insights/fixture-guide-one");
    expect(paths).not.toContain("/insights/fixture-placeholder");
    expect(paths).not.toContain("/insights/fixture-unapproved");
    expect(m.server.paths).toContain("/insights/fixture-guide-one");
    const xml = m.seo.buildSitemapXml(m.server.sitemapPaths, SITE);
    expect(xml).toContain(`${SITE}/insights/fixture-guide-one</loc>`);
    expect(xml).toContain(`${SITE}/insights</loc>`);
    expect(xml).not.toContain("fixture-placeholder");
    expect(xml).not.toContain("fixture-unapproved");
    // The static pages are unchanged by the feature.
    for (const p of await staticPaths()) expect(paths).toContain(p);
  });

  it("gives the post its own title, description, canonical and Open Graph tags, and indexes /insights", async () => {
    const m = await load({ posts: [good] });
    const html = prerendered(m, "/insights/fixture-guide-one");
    expect(checkSeoHead(html, `${SITE}/insights/fixture-guide-one`)).toEqual([]);
    expect(html).toContain("<title>Fixture Guide One for Test Readers Only</title>");
    expect(html).toContain(`property="og:url" content="${SITE}/insights/fixture-guide-one"`);
    expect(html).not.toContain("noindex");
    expect(m.seo.getSeo("/insights").noindex).toBeUndefined();
    expect(m.seo.renderHeadTags(m.seo.getSeo("/insights"))).toContain('rel="canonical"');
    expect(m.server.sitemapPaths).toContain("/insights");
  });

  it("renders one h1, a breadcrumb to /insights, working internal links and no owner marker", async () => {
    const m = await load({ posts: [good] });
    const doc = parse(m.server.render("/insights/fixture-guide-one"));
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(text(doc.querySelector("h1"))).toBe(good.title);
    const crumb = doc.querySelector('nav[aria-label="Breadcrumb"]');
    expect([...(crumb?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))).toEqual(["/", "/insights"]);
    const live = new Set(m.routes.getPublicPaths());
    const hrefs = [...doc.querySelectorAll("article a")].map((a) => a.getAttribute("href") as string);
    expect(hrefs).toEqual(expect.arrayContaining(["/services/website-design", "/free-audit", "/insights"]));
    for (const h of hrefs) expect(live.has(h), h).toBe(true);
    expect(doc.querySelector("article table th")?.getAttribute("scope")).toBe("col");
    expect(doc.querySelector("time")?.getAttribute("datetime")).toBe("2026-06-01");
    expect(text(doc.body)).not.toMatch(/\[\s*(owner|verify)/i);
  });

  it("emits Article and BreadcrumbList JSON-LD, with no second organisation, rating or review", async () => {
    const m = await load({ posts: [good] });
    const docs = m.ld.buildJsonLd("/insights/fixture-guide-one");
    const types = docs.map((d) => d["@type"]);
    expect(types).toEqual(["Article", "BreadcrumbList"]);
    const article = docs[0] as Record<string, unknown>;
    expect(article.headline).toBe(good.title);
    expect(article.datePublished).toBe("2026-06-01");
    expect(article.url).toBe(`${SITE}/insights/fixture-guide-one`);
    const crumb = docs[1] as { itemListElement: { name: string; item: string }[] };
    expect(crumb.itemListElement.map((i) => i.name)).toEqual(["Home", "Insights", good.title]);
    expect(crumb.itemListElement[1].item).toBe(`${SITE}/insights`);
    const parsed = readJsonLd(prerendered(m, "/insights/fixture-guide-one"));
    expect(parsed.errors).toEqual([]);
    expect(countOrganizations(parsed.values)).toBe(0);
    expect(findForbiddenSchemaKeys(parsed.values)).toEqual([]);
  });

  it("lists approved posts on /insights and nothing else", async () => {
    const m = await load({ posts: [good, placeholder, unapproved] });
    const doc = parse(m.server.render("/insights"));
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    const cards = [...doc.querySelectorAll("main article")];
    expect(cards).toHaveLength(1);
    expect(text(cards[0])).toContain(good.title);
    expect(cards[0].querySelector("a")?.getAttribute("href")).toBe("/insights/fixture-guide-one");
    expect(text(doc.body)).not.toContain("Fixture With A Placeholder");
    expect(text(doc.body)).not.toContain("Fixture Unapproved Draft");
  });

  it("serves the 404 page, noindex and no canonical, for an unapproved or blocked slug", async () => {
    const m = await load({ posts: [good, placeholder, unapproved] });
    for (const slug of ["fixture-placeholder", "fixture-unapproved", "no-such-post"]) {
      const path = `/insights/${slug}`;
      expect(text(parse(m.server.render(path)).querySelector("h1")), path).toBe("404");
      const seo = m.seo.getSeo(path);
      expect(seo.noindex, path).toBe(true);
      expect(m.seo.renderHeadTags(seo)).not.toContain("canonical");
      expect(m.ld.buildJsonLd(path)).toEqual([]);
    }
  });

  it("passes the build smoke checks when found through the sitemap", async () => {
    const m = await load({ posts: [good] });
    const xml = m.seo.buildSitemapXml(m.server.sitemapPaths, SITE);
    const routes = gatedRoutesFromSitemap(xml, SITE);
    expect(routes.map((r: { path: string }) => r.path)).toEqual(["/insights/fixture-guide-one"]);
    const html = prerendered(m, routes[0].path);
    expect(checkRouteBody(routes[0], 200, "text/html", html)).toEqual([]);
    expect(checkJsonLd(routes[0], html)).toEqual([]);
    expect(sitemapLocs(xml)).toContain(`${SITE}/insights/fixture-guide-one`);
  });
});

describe("STS-055 blog: nothing approved (the shipped state)", () => {
  const drafts = [post({ approved: false }), post({ slug: "fixture-two", approved: false })];

  it("adds no route, prerender path or sitemap URL, and keeps /insights noindex", async () => {
    const base = await staticPaths();
    const m = await load({ posts: drafts });
    expect(m.routes.getPublicPaths()).toEqual(base);
    expect(m.routes.getPublicPaths().filter((p: string) => p.startsWith("/insights/"))).toEqual([]);
    expect(m.routes.APP_ROUTES.some((r: { path: string }) => r.path === "/insights/:slug")).toBe(false);
    expect(m.server.sitemapPaths).not.toContain("/insights");
    expect(m.seo.buildSitemapXml(m.server.sitemapPaths, SITE)).not.toContain("/insights");
    const seo = m.seo.getSeo("/insights");
    expect(seo.noindex).toBe(true);
    expect(m.seo.renderHeadTags(seo)).toContain("noindex");
    expect(m.seo.renderHeadTags(seo)).not.toContain("canonical");
  });

  it("keeps /insights as it is today: no article card, and every topic is still plain text", async () => {
    const m = await load({ posts: drafts });
    const doc = parse(m.server.render("/insights"));
    expect(doc.querySelectorAll("main article")).toHaveLength(0);
    expect(doc.querySelectorAll("main ul li").length).toBeGreaterThanOrEqual(5);
    expect([...doc.querySelectorAll("main ul li a")].filter((a) => (a.getAttribute("href") ?? "").startsWith("/insights/"))).toHaveLength(0);
  });

  it("makes a draft's URL the 404 page", async () => {
    const m = await load({ posts: drafts });
    expect(text(parse(m.server.render("/insights/fixture-guide-one")).querySelector("h1"))).toBe("404");
    expect(m.seo.getSeo("/insights/fixture-guide-one").noindex).toBe(true);
  });
});

describe("STS-042 industry pages", () => {
  const good = entry();
  const marker = entry({ slug: "fixture-marker", name: "Marker", intro: "Fixture intro with [Owner to confirm: a fact] left in it." });
  const noService = entry({ slug: "fixture-no-service", services: [] });

  it("routes, prerenders and lists the hub and each complete entry, and no incomplete one", async () => {
    const m = await load({ industries: [good, marker, noService] });
    const paths = m.routes.getPublicPaths();
    expect(paths).toEqual(expect.arrayContaining(["/industries", "/industries/fixture-bakery"]));
    expect(paths).not.toContain("/industries/fixture-marker");
    expect(paths).not.toContain("/industries/fixture-no-service");
    const xml = m.seo.buildSitemapXml(m.server.sitemapPaths, SITE);
    expect(xml).toContain(`${SITE}/industries</loc>`);
    expect(xml).toContain(`${SITE}/industries/fixture-bakery</loc>`);
    expect(xml).not.toContain("fixture-marker");
  });

  it("has its own head tags, breadcrumb schema and no organisation, rating or review", async () => {
    const m = await load({ industries: [good] });
    const html = prerendered(m, "/industries/fixture-bakery");
    expect(checkSeoHead(html, `${SITE}/industries/fixture-bakery`)).toEqual([]);
    expect(html).toContain(`<title>${good.metaTitle}</title>`);
    const crumb = m.ld.buildJsonLd("/industries/fixture-bakery")[0] as { itemListElement: { name: string }[] };
    expect(crumb.itemListElement.map((i) => i.name)).toEqual(["Home", "Industries", "Fixture Bakeries"]);
    const parsed = readJsonLd(html);
    expect(countOrganizations(parsed.values)).toBe(0);
    expect(findForbiddenSchemaKeys(parsed.values)).toEqual([]);
    expect(m.seo.getSeo("/industries").title).not.toBe(good.metaTitle);
  });

  it("renders one h1, the entry's own copy, links to its service pages and a free-audit call to action", async () => {
    const m = await load({ industries: [good] });
    const doc = parse(m.server.render("/industries/fixture-bakery"));
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(text(doc.querySelector("h1"))).toBe(good.h1);
    expect(text(doc.body)).toContain(good.intro);
    const hrefs = [...doc.querySelectorAll("main a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/services/website-design", "/services/local-seo", "/free-audit"]));
    expect(hrefs).not.toContain("/services/paid-ads");
    const live = new Set(m.routes.getPublicPaths());
    for (const h of hrefs.filter((x): x is string => !!x && x.startsWith("/"))) expect(live.has(h) || h === "/contact", h).toBe(true);
    expect(doc.querySelectorAll('[data-final-cta]')).toHaveLength(1);
    const hub = parse(m.server.render("/industries"));
    expect(hub.querySelectorAll("h1")).toHaveLength(1);
    expect([...hub.querySelectorAll('[data-local-section="list"] li a')].map((a) => a.getAttribute("href"))).toEqual(["/industries/fixture-bakery"]);
  });

  it("serves the 404 page for an unlisted slug", async () => {
    const m = await load({ industries: [good, marker] });
    expect(text(parse(m.server.render("/industries/fixture-marker")).querySelector("h1"))).toBe("404");
    expect(m.seo.getSeo("/industries/fixture-marker").noindex).toBe(true);
  });

  it("publishes nothing while the list is empty (the shipped state)", async () => {
    const base = await staticPaths();
    const m = await load({ industries: [] });
    expect(m.routes.getPublicPaths()).toEqual(base);
    expect(m.routes.getPublicPaths().some((p: string) => p.startsWith("/industries"))).toBe(false);
    expect(m.seo.buildSitemapXml(m.server.sitemapPaths, SITE)).not.toContain("/industries");
    expect(m.seo.getSeo("/industries").noindex).toBe(true);
    expect(text(parse(m.server.render("/industries")).querySelector("h1"))).toBe("404");
    expect(text(parse(m.server.render("/industries/fixture-bakery")).querySelector("h1"))).toBe("404");
  });
});

describe("STS-043 service-area pages", () => {
  const hilliard = area();
  const dublin = area({
    slug: "fixture-dublin",
    name: "Fixture Dublin",
    h1: "Web Design for Fixture Dublin Businesses",
    metaTitle: "Fixture Dublin Web Design | SarayaTech",
    metaDescription: "Fixture meta description for the Fixture Dublin service-area page, written by the test to prove the owner gate and nothing else at all.",
    intro: "A completely different fixture intro about a pretend client meeting held near a pretend river, also long enough to pass the length check.",
  });

  it("routes, prerenders and lists each confirmed, unique suburb at /locations/<slug>", async () => {
    const m = await load({ areas: [hilliard, dublin] });
    const paths = m.routes.getPublicPaths();
    expect(paths).toEqual(expect.arrayContaining(["/locations/fixture-hilliard", "/locations/fixture-dublin"]));
    const xml = m.seo.buildSitemapXml(m.server.sitemapPaths, SITE);
    expect(xml).toContain(`${SITE}/locations/fixture-hilliard</loc>`);
    expect(xml).toContain(`${SITE}/locations/fixture-dublin</loc>`);
    expect(paths.some((p: string) => p === "/locations")).toBe(false);
  });

  it("has head tags, one h1, its own intro, service links and the free-audit CTA", async () => {
    const m = await load({ areas: [hilliard, dublin] });
    const html = prerendered(m, "/locations/fixture-hilliard");
    expect(checkSeoHead(html, `${SITE}/locations/fixture-hilliard`)).toEqual([]);
    const doc = parse(m.server.render("/locations/fixture-hilliard"));
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(text(doc.querySelector("h1"))).toBe(hilliard.h1);
    expect(text(doc.body)).toContain(hilliard.intro);
    expect(text(doc.body)).not.toContain(dublin.intro);
    const hrefs = [...doc.querySelectorAll("main a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/services/website-design", "/free-audit"]));
    const crumb = m.ld.buildJsonLd("/locations/fixture-hilliard")[0] as { itemListElement: { name: string }[] };
    expect(crumb.itemListElement.map((i) => i.name)).toEqual(["Home", "Fixture Hilliard"]);
  });

  it("does not render an entry that is unconfirmed, too short, or a swapped-name copy of another intro", async () => {
    const unconfirmed = area({ slug: "fixture-unconfirmed", ownerConfirmed: false });
    const short = area({ slug: "fixture-short", name: "Fixture Short", intro: "Too short." });
    // Same sentence as Hilliard with only the suburb's name changed: the doorway-page pattern.
    const swapped = area({ slug: "fixture-swapped", name: "Fixture Swapped", intro: hilliard.intro.replace("Fixture Hilliard", "Fixture Swapped") });
    const m = await load({ areas: [dublin, unconfirmed, short, hilliard, swapped] });
    const live = m.routes.getPublicPaths().filter((p: string) => p.startsWith("/locations/"));
    expect(live).toEqual(["/locations/fixture-dublin"]);
    for (const slug of ["fixture-unconfirmed", "fixture-short", "fixture-swapped", "fixture-hilliard"]) {
      expect(text(parse(m.server.render(`/locations/${slug}`)).querySelector("h1")), slug).toBe("404");
    }
  });

  it("publishes nothing while the list is empty (the shipped state)", async () => {
    const base = await staticPaths();
    const m = await load({ areas: [] });
    expect(m.routes.getPublicPaths()).toEqual(base);
    expect(m.routes.getPublicPaths().some((p: string) => p.startsWith("/locations"))).toBe(false);
    expect(m.seo.buildSitemapXml(m.server.sitemapPaths, SITE)).not.toContain("/locations");
    expect(m.seo.getSeo("/locations/fixture-hilliard").noindex).toBe(true);
    expect(text(parse(m.server.render("/locations/fixture-hilliard")).querySelector("h1"))).toBe("404");
  });
});
