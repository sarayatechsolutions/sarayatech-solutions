import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import chatbotService, { ChatbotService } from "./chatbot.service";
import openAIService from "./openai.service";
import knowledgeBase from "@/data/chatbot/knowledge-base.json";
import intentsData from "@/data/chatbot/intents.json";
import { getPublicPaths } from "@/routes";
import { POPULATED } from "./chatbot-facts.fixtures";

// STS-057: every page link the local (offline) chatbot prints must be a live, prerendered route.
// /solutions, /industries, /industry/* and /realisation are retired (301s in public/_redirects);
// the bot links to where they go (/services, /our-work), never to the redirect.

beforeEach(() => {
  openAIService.resetConversation();
  // Offline: the AI backend is unreachable, so every reply is a local one.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const live = new Set(getPublicPaths());

/**
 * Root-relative page paths in a reply ("/services", "/our-work"). Not a path: "24/7", "and/or",
 * a URL's own path (https://x.com/a), an /api/ call. The rule mirrors how the renderer treats a
 * root-relative link as internal navigation (src/components/chatbot/links.ts).
 */
function pagePaths(reply: string): string[] {
  return [...reply.matchAll(/(?<![\w.:/])\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*/gi)]
    .map((m) => m[0])
    .filter((p) => !p.startsWith("/api/"));
}

type Generators = Record<string, (arg?: string) => string>;

/** Every local reply the bot can produce, with the default and with a populated business config. */
function allLocalReplies(): string[] {
  const out: string[] = [];
  for (const bot of [chatbotService, new ChatbotService(POPULATED)]) {
    const g = bot as unknown as Generators;
    for (const name of [
      "generateServicesResponse",
      "generatePricingResponse",
      "generateContactResponse",
      "generateLocationResponse",
      "generateBookingResponse",
      "generateProcessResponse",
      "generateCompanyResponse",
      "generatePaymentResponse",
      "generateContractResponse",
      "generateSupportResponse",
      "generateDefaultResponse",
    ]) {
      out.push(g[name].call(bot));
    }
    for (const key of Object.keys(knowledgeBase.services)) out.push(g.generateServiceDetailResponse.call(bot, key));
    out.push(g.generateProblemSolutionResponse.call(bot, "we have no website, no online presence and need more leads"));
  }
  for (const intent of intentsData.intents) out.push(...(intent.responses ?? []));
  return out.filter((r) => r && r.trim());
}

describe("chatbot replies link only to live routes (STS-057)", () => {
  it("the path extractor finds page links and ignores everything else", () => {
    expect(pagePaths("🔗 **Explore:** /services\n🔗 **More:** /services/local-seo")).toEqual(["/services", "/services/local-seo"]);
    expect(pagePaths("see [our work](/our-work).")).toEqual(["/our-work"]);
    expect(pagePaths("24/7 and/or https://example.com/solutions and /api/chat")).toEqual([]);
  });

  it("every local reply links only to prerendered routes, never to a retired URL", () => {
    const replies = allLocalReplies();
    expect(replies.length).toBeGreaterThan(20);
    const linked = new Set(replies.flatMap(pagePaths));
    // The replies do link somewhere: the services hub, Our Work, About and Contact at least.
    for (const p of ["/services", "/our-work", "/about", "/contact"]) expect(linked).toContain(p);
    for (const p of linked) expect(live.has(p), `chatbot links to ${p}, which is not a live route`).toBe(true);
    expect([...linked].filter((p) => /^\/(solutions|industries|industry|realisation)(\/|$)/.test(p))).toEqual([]);
  });

  it("the answer to every intent keyword, through getResponse, links only to live routes", async () => {
    for (const intent of intentsData.intents) {
      const word = intent.keywords[0]?.word;
      if (!word) continue;
      const reply = await chatbotService.getResponse(word);
      for (const p of pagePaths(reply)) expect(live.has(p), `"${word}" (${intent.id}) links to ${p}`).toBe(true);
    }
  });
});
