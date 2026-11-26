import { describe, it, expect } from "vitest";
import knowledgeBase from "./knowledge-base.json";
import intentsData from "./intents.json";
import servicesProblems from "./services-problems.json";
import pricingDetails from "./pricing-details.json";
import { ChatbotService } from "@/services/chatbot.service";
import { SERVICE_PAGES } from "@/content/services/services";

/**
 * F1 (STS-052 regression): with no AI key the chatbot answers from these two files. They must
 * describe only the services the site sells today (SERVICE_PAGES) and none of the retired ones.
 */
const RETIRED_TERMS: RegExp[] = [
  /gdpr/i,
  /compliance/i,
  /enterprise/i,
  /cyber ?security/i,
  /penetration/i,
  /security (audit|monitoring|awareness)/i,
  /web (&|and) mobile/i,
  /ai automation/i,
  /chatbot/i,
  /business intelligence/i,
  /power bi/i,
  /tableau/i,
  /data warehouse/i,
  /\bETL\b/,
  /cloud (migration|& infrastructure|and infrastructure|services)/i,
  /kubernetes/i,
  /terraform/i,
  /digital (strategy|transformation)/i,
  /legacy/i,
  /roadmap/i,
  /bronze|silver|gold/i,
];

const files = {
  "knowledge-base.json": knowledgeBase,
  "intents.json": intentsData,
  "services-problems.json": servicesProblems,
  "pricing-details.json": pricingDetails,
};

describe("chatbot local content matches today's services", () => {
  for (const [name, data] of Object.entries(files)) {
    // Keys starting with "_" are developer notes (file paths), not visitor-facing text.
    const text = JSON.stringify(data, (k, v) => (k.startsWith("_") ? undefined : v));

    it(`${name} mentions no retired service, compliance claim or invented figure`, () => {
      for (const term of RETIRED_TERMS) expect(text, `${name} matches ${term}`).not.toMatch(term);
      expect(text, "percentage").not.toMatch(/\d\s?%/);
      expect(text, "dollar amount").not.toMatch(/\$\s?\d/);
      expect(text, "years claim").not.toMatch(/\d+\+?\s+years/i);
      expect(text, "guarantee").not.toMatch(/guarantee/i);
    });

    it(`${name}: every /services/<slug> link is a real service page`, () => {
      const slugs = new Set<string>(SERVICE_PAGES.map((p) => p.slug));
      const linked = [...text.matchAll(/\/services\/([a-z0-9-]+)/g)].map((m) => m[1]);
      for (const slug of linked) expect(slugs.has(slug), `${name} links /services/${slug}`).toBe(true);
    });
  }

  it("knowledge base lists exactly the services in SERVICE_PAGES", () => {
    const routes = Object.values(knowledgeBase.services).map((s) => (s as { route: string }).route);
    expect(routes.sort()).toEqual(SERVICE_PAGES.map((p) => `/services/${p.slug}`).sort());
  });

  it("pricing-details.json says costs are quoted", () => {
    expect(JSON.stringify(pricingDetails)).toMatch(/quoted/i);
  });

  // A5-5 (security addendum 5): the earlier pattern lacked its backslashes and matched nothing.
  const TIMELINE = /\d+\s?(weeks?|months?|days?)/i;
  it("the timeline check really catches a timeline", () => {
    expect("ready in 2 weeks").toMatch(TIMELINE);
    expect("about 3months").toMatch(TIMELINE);
  });
  for (const [name, data] of Object.entries({ knowledgeBase, intentsData, servicesProblems, pricingDetails })) {
    it(`${name} promises no timeline`, () => {
      expect(JSON.stringify(data)).not.toMatch(TIMELINE);
    });
  }
});

describe("chatbot hard-coded answers", () => {
  const bot = new ChatbotService() as unknown as {
    generateContractResponse: () => string;
    generatePricingResponse: () => string;
    getSuggestedQuestions: () => string[];
  };

  it("the contract answer makes no ownership, NDA or revision commitment", () => {
    const reply = bot.generateContractResponse();
    expect(reply).not.toMatch(/NDA/);
    expect(reply).not.toMatch(/own all/i);
    expect(reply).not.toMatch(/revision/i);
    expect(reply).toMatch(/written proposal/);
    expect(reply).toContain("/contact");
  });

  it("the pricing answer links to /pricing", () => {
    expect(bot.generatePricingResponse()).toContain("/pricing");
  });

  it("suggested questions do not mention retired services", () => {
    const text = bot.getSuggestedQuestions().join(" ");
    for (const term of RETIRED_TERMS) expect(text).not.toMatch(term);
    expect(text).not.toMatch(/AI automation/i);
  });
});
