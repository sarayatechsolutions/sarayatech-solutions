import { describe, it, expect } from "vitest";
import { inject, injectHead, outputFile, withSitemapLine } from "../tools/prerender.mjs";

describe("prerender script", () => {
  it("maps URL paths to dist files", () => {
    expect(outputFile("/")).toBe("index.html");
    expect(outputFile("/about")).toBe("about/index.html");
    expect(outputFile("/solutions/web-mobile-development")).toBe("solutions/web-mobile-development/index.html");
    expect(outputFile("/careers/")).toBe("careers/index.html");
  });

  it("injects markup into the empty root, keeping the rest of the shell", () => {
    const out = inject('<head></head><body><div id="root"></div><script src="/a.js"></script></body>', "<h1>Hi $& there</h1>");
    expect(out).toBe('<head></head><body><div id="root"><h1>Hi $& there</h1></div><script src="/a.js"></script></body>');
  });

  it("fails loudly when the shell has no empty root", () => {
    expect(() => inject('<div id="root"><p>x</p></div>', "<h1>x</h1>")).toThrow(/no <div id="root">/);
  });
});

describe("prerender SEO injection (STS-021)", () => {
  const shell = [
    "<html><head>",
    "<title>\n  Generic\n</title>",
    '<meta\n name="description"\n content="generic" />',
    '<meta name="author" content="x" />',
    '<meta property="og:title" content="generic" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<link rel="canonical" href="https://old.example/" />',
    '<link href="/font.css" rel="stylesheet" />',
    '</head><body><div id="root"></div></body></html>',
  ].join("\n");
  const head = '<title>Mine</title>\n<meta name="description" content="Mine desc" />\n<link rel="canonical" href="https://x.test/a" />';

  it("replaces the generic tags rather than duplicating them, and keeps unrelated head tags", () => {
    const out = inject(shell, "<h1>x</h1>", head);
    expect(out.match(/<title/g)).toHaveLength(1);
    expect(out.match(/name="description"/g)).toHaveLength(1);
    expect(out.match(/rel="canonical"/g)).toHaveLength(1);
    expect(out).toContain("<title>Mine</title>");
    expect(out).not.toContain("Generic");
    expect(out).not.toContain("old.example");
    expect(out).not.toContain("og:title");
    expect(out).toContain('name="author"');
    expect(out).toContain('href="/font.css"');
    expect(out).toContain('<div id="root"><h1>x</h1></div>');
  });

  it("leaves the generic shell alone when no head html is given", () => {
    expect(inject(shell, "<h1>x</h1>")).toContain("Generic");
  });

  it("fails loudly when the shell has no </head>", () => {
    expect(() => injectHead("<body></body>", head)).toThrow(/no <\/head>/);
  });

  it("puts the Sitemap line on the canonical host exactly once", () => {
    const out = withSitemapLine("User-agent: *\r\nAllow: /\r\n\r\nSitemap: https://old.example/sitemap.xml\r\n", "https://x.test");
    expect(out.match(/Sitemap:/g)).toHaveLength(1);
    expect(out).toContain("Sitemap: https://x.test/sitemap.xml");
    expect(out).toContain("Allow: /");
  });
});
