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

describe("chatbot technology, integration, scalability and speed answers (STS-077)", () => {
  const PRICES_AND_TIMELINES = [/\$\s?\d/, /\d+\s?(weeks?|months?|days?)/i, /guarantee/i, /\bNDA\b/, /\d\s?%/];
  const expectLocalAnswer = (reply: string) => {
    expect(reply).not.toContain("That's a great question");
    expect(reply).not.toContain("While I'm still learning");
    expectNoClaims(reply);
    for (const re of PRICES_AND_TIMELINES) expect(reply).not.toMatch(re);
    expect(reply).toMatch(/\/(contact|free-audit)/);
  };

  const cases: [string, RegExp][] = [
    ["what technology do you use", /decided per project/],
    ["What is your tech stack?", /decided per project/],
    ["do you use WordPress", /decided per project/],
    ["Do you build with Shopify or Wix?", /decided per project/],
    ["can you integrate with my booking system", /Connecting to the tools you already use/],
    ["can you integrate with Square", /Connecting to the tools you already use/],
    ["can you integrate with Google", /Connecting to the tools you already use/],
    ["can it connect to my CRM", /Connecting to the tools you already use/],
    ["Do you build apps that connect to Stripe?", /Connecting to the tools you already use/],
    ["will my site handle growth", /Room to grow/],
    ["Will it scale if I get busy?", /Room to grow/],
    ["what if I get high traffic", /Room to grow/],
    ["is my site going to be fast", /Fast, mobile-friendly pages/],
    ["is my website slow", /Fast, mobile-friendly pages/],
    ["how is your page speed", /Fast, mobile-friendly pages/],
  ];

  it.each(cases)("%s gets a grounded local answer", async (question, expected) => {
    const reply = await chatbotService.getResponse(question);
    expect(reply).toMatch(expected);
    expectLocalAnswer(reply);
  });

  it("never claims a stack, a certification or a specific integration", async () => {
    const replies = await Promise.all(cases.map(([q]) => chatbotService.getResponse(q)));
    for (const reply of replies) {
      expect(reply).not.toMatch(/\b(react|node|aws|azure|wordpress is|we (use|integrate with) (square|stripe|quickbooks|salesforce|hubspot))\b/i);
      expect(reply).not.toMatch(/certified|iso ?\d|soc ?2|uptime|99\.\d/i);
    }
  });

  it("only links to internal routes that exist", async () => {
    const { getPublicPaths } = await import("@/routes");
    const routed = new Set(getPublicPaths());
    for (const [q] of cases) {
      const reply = await chatbotService.getResponse(q);
      for (const m of reply.matchAll(/(?:^|[\s(])(\/[a-z0-9\-/]*)/g)) {
        expect(routed.has(m[1].replace(/\/$/, "") || "/"), `${q} links ${m[1]}`).toBe(true);
      }
    }
    // The dynamic import of @/routes (every page) is a cold transform inside the test body; it took
    // 5.0 s on a loaded run, over vitest's 5 s default. Timeout only; the assertions are unchanged.
  }, 30_000);

  it("does not steal pricing, services, contact, packages, timeline, support or local SEO questions", async () => {
    const intentOf = (q: string) =>
      (chatbotService as unknown as { detectIntent: (m: string) => { intent: { id: string } } | null })
        .detectIntent(q)?.intent.id;
    const expectations: [string, string][] = [
      ["How much does it cost?", "pricing"],
      ["What services do you offer?", "services_general"],
      ["How can I contact you?", "contact"],
      ["Tell me about local SEO", "local_seo"],
      ["tell me about google reviews", "local_seo"],
      ["how do I grow my business on google", "local_seo"],
      ["What is Local Growth?", "packages"],
      ["What is Full Growth?", "packages"],
      ["what are your packages", "packages"],
      ["how fast can you build it", "timeline"],
      ["how long does it take", "timeline"],
      ["what time do you open", "timeline"],
      ["Do you offer support after launch?", "support"],
      ["what is your development process", "process"],
      ["I'd like to schedule a consultation", "booking"],
    ];
    for (const [q, id] of expectations) expect(intentOf(q), q).toBe(id);
  });

  it("the new intents each carry a local answer, so none falls through to the default reply", () => {
    for (const id of ["technology", "integration", "scalability", "site_speed"]) {
      const intent = intentsData.intents.find((i) => i.id === id) as { responses?: string[] } | undefined;
      expect(intent?.responses?.length, id).toBeGreaterThan(0);
    }
  });
});

describe("chatbot pricing, WhatsApp and free-audit phrasings (STS-077 follow-up)", () => {
  const intentOf = (q: string) =>
    (chatbotService as unknown as { detectIntent: (m: string) => { intent: { id: string } } | null })
      .detectIntent(q)?.intent.id;

  it.each([
    "How much does a website cost?",
    "what does a website cost",
    "how much for an app",
    "price of local SEO",
  ])("%s lands on pricing and gets the quote-only answer", async (q) => {
    expect(intentOf(q)).toBe("pricing");
    const reply = await chatbotService.getResponse(q);
    expect(reply).toContain(PRICING_REPLY);
    expect(reply).toContain("/pricing");
    expectNoClaims(reply);
  });

  it.each(["Can I connect with you on WhatsApp", "do you have whatsapp"])("%s lands on contact", async (q) => {
    expect(intentOf(q)).toBe("contact_channels");
    expect(await chatbotService.getResponse(q)).toBe(contactReply());
  });

  it.each(["how do I use your free audit", "what is the free audit", "do you offer a website audit"])(
    "%s points to /free-audit",
    async (q) => {
      expect(intentOf(q)).toBe("free_audit");
      const reply = await chatbotService.getResponse(q);
      expect(reply).toContain("/free-audit");
      expect(reply).not.toMatch(/\d+\s?(weeks?|months?|days?)|guarantee|\$\s?\d/i);
      expectNoClaims(reply);
    },
  );

  it("keeps package, contact, booking and technology questions on their own intents", () => {
    expect(intentOf("What is Local Growth?")).toBe("packages");
    expect(intentOf("what are your packages")).toBe("packages");
    expect(intentOf("How can I contact you?")).toBe("contact");
    expect(intentOf("I'd like to schedule a consultation")).toBe("booking");
    expect(intentOf("what technology do you use")).toBe("technology");
    expect(intentOf("will my site handle growth")).toBe("scalability");
    expect(intentOf("What services do you offer?")).toBe("services_general");
  });
});
