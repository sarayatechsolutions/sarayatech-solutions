import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import chatbotService, { ChatbotService, CHAT_UNAVAILABLE_MESSAGE, PRICING_REPLY } from "./chatbot.service";
import openAIService from "./openai.service";
import knowledgeBase from "@/data/chatbot/knowledge-base.json";
import intentsData from "@/data/chatbot/intents.json";
import { bookingCta, bookingReply, contactReply, locationReply } from "./chatbot-facts";
import { POPULATED, SERVICE_AREA, STALE_FACTS, expectNoStaleFacts } from "./chatbot-facts.fixtures";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  openAIService.resetConversation();
  // Offline by default: no test may reach a real backend.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type Generators = Record<
  "generatePricingResponse" | "generatePaymentResponse" | "generateContractResponse" | "generateSupportResponse",
  () => string
>;
const generators = chatbotService as unknown as Generators;

// Claims the business has not substantiated: the bot must never state them.
const FABRICATED_CLAIMS = [
  /projects (successfully )?delivered/i,
  /client satisfaction/i,
  /enterprise clients/i,
  /years? of industry experience/i,
  /30%|40%/,
  /\$\s?\d/,
  /20k/i,
  /30-90/,
  /24\/7/,
  /guaranteed response/i,
  /bronze|silver|gold/i,
];

function expectNoClaims(reply: string) {
  for (const claim of FABRICATED_CLAIMS) expect(reply).not.toMatch(claim);
  expect(reply).not.toMatch(/undefined/i);
  expect(reply).not.toMatch(/^•\s*$/m);
}

describe("chatbot company answer (FE-08 + content: no stats claims)", () => {
  it("describes the company without stats, placeholders or empty bullets", async () => {
    const reply = await chatbotService.getResponse("company history");

    expect(reply).toContain("About SarayaTech Solutions");
    expect(reply).toContain(knowledgeBase.company.description);
    expectNoClaims(reply);
  });
});

describe("chatbot pricing, payment, contract and support answers (no hard-coded claims)", () => {
  it("answers pricing only with the free-consultation line and where to go next", () => {
    const reply = generators.generatePricingResponse();
    expect(reply).toContain(PRICING_REPLY);
    expect(reply).toContain("/contact");
    // The booking link is unverified in config (06 C15): the bot must not print it.
    expect(reply).not.toMatch(/calendly/i);
    expect(reply).toContain(bookingCta());
    expectNoClaims(reply);
  });

  it.each(["generatePaymentResponse", "generateContractResponse", "generateSupportResponse"] as const)(
    "%s states no invented terms, prices, warranties or SLAs",
    (name) => {
      const reply = generators[name]();
      expect(reply).toContain("/contact");
      expectNoClaims(reply);
    },
  );

  it.each(["how much does it cost", "Bronze package", "how much does a website cost", "payment terms"])(
    "answers the visitor question %j with the consultation line and no figures",
    async (question) => {
      const reply = await chatbotService.getResponse(question);
      expect(reply).toContain(PRICING_REPLY);
      expectNoClaims(reply);
    },
  );
});

describe("chatbot backend + fallback (STS-012)", () => {
  it("returns the backend reply when /api/chat succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true, reply: "From the backend" }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await chatbotService.getResponse("What services do you offer?")).toBe("From the backend");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/chat$/);
  });

  it.each([
    ["429", () => Promise.resolve(json(429, { success: false, message: "slow down" }))],
    ["503", () => Promise.resolve(json(503, { success: false, message: "down" }))],
    ["network error", () => Promise.reject(new TypeError("offline"))],
  ])("falls back to local rule-based answers on %s", async (_label, impl) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(impl));
    const reply = await chatbotService.getResponse("company history");
    expect(reply).toContain("About SarayaTech Solutions");
  });

  it("shows the unavailable message when no local answer exists either", async () => {
    const local = vi
      .spyOn(chatbotService as unknown as { getIntentBasedResponse: (m: string) => string }, "getIntentBasedResponse")
      .mockReturnValue("");

    expect(await chatbotService.getResponse("anything")).toBe(CHAT_UNAVAILABLE_MESSAGE);
    expect(local).toHaveBeenCalled();
  });
});

describe("chatbot location, contact and booking answers come from business config (STS-058 / REQ-154)", () => {
  const LOCATION_QUESTIONS = ["Where are you located?", "Where is your office?"];
  const CONTACT_QUESTIONS = ["How can I contact you?", "What is your phone number?"];
  const BOOKING_QUESTIONS = ["I'd like to schedule a consultation", "Can I book a meeting?"];

  it.each(LOCATION_QUESTIONS)("answers %j with exactly the config fallback location", async (q) => {
    const reply = await chatbotService.getResponse(q);
    expect(reply).toBe(locationReply());
    expect(reply).toContain(SERVICE_AREA);
    expect(reply).toContain("/contact");
    expectNoStaleFacts(reply);
  });

  it.each(CONTACT_QUESTIONS)("answers %j with exactly the config fallback contact answer", async (q) => {
    const reply = await chatbotService.getResponse(q);
    expect(reply).toBe(contactReply());
    expect(reply).toContain("/contact");
    expectNoStaleFacts(reply);
  });

  it.each(BOOKING_QUESTIONS)("answers %j with exactly the config fallback booking answer", async (q) => {
    const reply = await chatbotService.getResponse(q);
    expect(reply).toBe(bookingReply());
    expect(reply).toContain("/contact");
    expectNoStaleFacts(reply);
  });

  it("states the populated config's facts when a populated config is passed in", async () => {
    const bot = new ChatbotService(POPULATED);
    expect(await bot.getResponse(LOCATION_QUESTIONS[0])).toBe(locationReply(POPULATED));
    expect(await bot.getResponse(CONTACT_QUESTIONS[0])).toBe(contactReply(POPULATED));
    expect(await bot.getResponse(BOOKING_QUESTIONS[0])).toBe(bookingReply(POPULATED));
    expect(await bot.getResponse(CONTACT_QUESTIONS[0])).toContain("hello@example.test");
    expect(await bot.getResponse(BOOKING_QUESTIONS[0])).toContain("https://booking.example.test/saraya");
  });

  it("no local answer anywhere states a stale or unconfirmed contact fact", () => {
    type Gen = Record<string, (arg?: string) => string>;
    const g = chatbotService as unknown as Gen;
    const replies = [
      g.generateServicesResponse(),
      ...["web_development", "ai_chatbot", "data_analytics", "cloud_services", "custom_solution", "security"].map(
        (ctx) => g.generateServiceDetailResponse(ctx),
      ),
      g.generatePricingResponse(),
      g.generateContactResponse(),
      g.generateLocationResponse(),
      g.generateBookingResponse(),
      g.generateProcessResponse(),
      g.generateCompanyResponse(),
      g.generatePaymentResponse(),
      g.generateContractResponse(),
      g.generateSupportResponse(),
      g.generateProblemSolutionResponse("we have a legacy system and need more leads"),
      g.generateDefaultResponse(),
      ...intentsData.intents.flatMap((i) => ("responses" in i && Array.isArray(i.responses) ? i.responses : [])),
    ];
    expect(replies.length).toBeGreaterThan(20);
    for (const reply of replies) expectNoStaleFacts(reply);
  });

  it("the JSON knowledge base and intents hold no contact facts any more", () => {
    const json = JSON.stringify(knowledgeBase) + JSON.stringify(intentsData);
    expect(json.length).toBeGreaterThan(1000);
    for (const fact of [/783-0443/, /info@saraya\.tech/i, /sarayatech\.com/i, /Hamilton/i, /43232/, /calendly\.com/i, /linkedin\.com/i, /@sarayatech/i]) {
      expect(json).not.toMatch(fact);
    }
    expect(STALE_FACTS.length).toBeGreaterThan(0);
  });
});

describe("chatbot quick actions reach their intended local answer (scorer: no 1-2 letter partial matches)", () => {
  it("each quick action gets the matching answer, not a service-detail page", async () => {
    const byLabel = Object.fromEntries(chatbotService.getQuickActions().map((a) => [a.label, a.message]));
    const ask = (labelPart: string) => {
      const label = Object.keys(byLabel).find((l) => l.includes(labelPart));
      expect(label, labelPart).toBeDefined();
      return chatbotService.getResponse(byLabel[label!]);
    };
    expect(await ask("Book a Meeting")).toBe(bookingReply());
    expect(await ask("Contact")).toBe(contactReply());
    expect(await ask("Pricing")).toContain(PRICING_REPLY);
    expect(await ask("Our Services")).toContain("We offer a comprehensive range of digital solutions");
  });
});
