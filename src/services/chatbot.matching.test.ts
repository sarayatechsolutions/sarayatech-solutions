import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import chatbotService, {
  CHAT_FALLBACK_REPLY,
  normaliseForMatching,
  phraseOccurs,
  tokenise,
} from "./chatbot.service";
import openAIService from "./openai.service";
import intentsData from "@/data/chatbot/intents.json";

// FF-4 (functional audit 2026-11-27): the local (offline) scorer matched keywords as raw substrings,
// so "hi" fired inside "blockchain", "this" and "which", "yo" inside "your", "sup" inside "support",
// and any message with "your" got a greeting. This is the answer every visitor gets whenever the
// AI backend has no key or is down, so these run with the backend unreachable.

beforeEach(() => {
  openAIService.resetConversation();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const intentOf = (q: string) =>
  (chatbotService as unknown as { detectIntent: (m: string) => { intent: { id: string } } | null }).detectIntent(q)
    ?.intent.id ?? null;

const GREETINGS = (intentsData.intents.find((i) => i.id === "greeting")?.responses ?? []) as string[];

describe("FF-4: keywords match whole words, not substrings", () => {
  it.each(["Do you do blockchain development?", "What are your hours?", "this", "which", "your"])(
    "%j is not taken for a greeting and gets the honest fallback",
    async (q) => {
      expect(intentOf(q)).not.toBe("greeting");
      const reply = await chatbotService.getResponse(q);
      expect(GREETINGS.length).toBeGreaterThan(0);
      for (const greeting of GREETINGS) expect(reply).not.toBe(greeting);
      expect(reply).toBe(CHAT_FALLBACK_REPLY);
    },
  );

  it('"support" reaches the support answer, not a greeting ("sup" is a word, not a prefix)', async () => {
    expect(intentOf("support")).toBe("support");
    expect(await chatbotService.getResponse("support")).toMatch(/Support/);
  });

  it.each(["They told me to ask", "Can you write my homework?", "Do you do ecommerce?"])(
    "%j no longer gets a greeting",
    (q) => {
      expect(intentOf(q)).not.toBe("greeting");
    },
  );

  it.each(["hi", "Hi!", "hey there", "Hello", "yo", "What's up", "What’s up?", "whats up"])(
    "a real greeting %j is still a greeting",
    (q) => {
      expect(intentOf(q)).toBe("greeting");
    },
  );

  it("a team question gets the company answer, not the old default", async () => {
    expect(intentOf("Who is on your team?")).toBe("team");
    expect(await chatbotService.getResponse("Who is on your team?")).toMatch(/About SarayaTech Solutions/);
  });
});

describe("FF-4: the fallback is reachable and offers a person", () => {
  it("a question with no keyword at all gets the fallback (out_of_scope no longer shadows it)", async () => {
    expect(intentOf("What is the weather today?")).toBeNull();
    expect(await chatbotService.getResponse("What is the weather today?")).toBe(CHAT_FALLBACK_REPLY);
  });

  it("the fallback says it does not know, and links the contact form and the free audit", () => {
    expect(CHAT_FALLBACK_REPLY).toMatch(/not sure/i);
    expect(CHAT_FALLBACK_REPLY).toContain("[contact form](/contact)");
    expect(CHAT_FALLBACK_REPLY).toContain("[free audit](/free-audit)");
    expect(CHAT_FALLBACK_REPLY).not.toMatch(/great question|still learning|book a call/i);
  });
});

describe("FF-4: normalisation and phrase matching", () => {
  it("folds case, accents, curly apostrophes and punctuation the same way for messages and keywords", () => {
    expect(normaliseForMatching("  WHAT’S   up?! ")).toBe("whats up");
    expect(normaliseForMatching("What's up")).toBe("whats up");
    expect(normaliseForMatching("Café résumé")).toBe("cafe resume");
    expect(normaliseForMatching("Ask SarayaTech about e-commerce")).toBe("ask about e commerce");
    expect(tokenise("")).toEqual([]);
  });

  it("matches a phrase only as a contiguous run of whole words", () => {
    const msg = tokenise("Do you do blockchain development for this business?");
    expect(phraseOccurs(msg, ["hi"])).toBe(false);
    expect(phraseOccurs(msg, ["chain"])).toBe(false);
    expect(phraseOccurs(msg, ["development"])).toBe(true);
    expect(phraseOccurs(msg, ["blockchain", "development"])).toBe(true);
    expect(phraseOccurs(msg, ["development", "blockchain"])).toBe(false);
    // Plurals count, short words must be exact.
    expect(phraseOccurs(tokenise("what do websites cost"), tokenise("website"))).toBe(true);
    expect(phraseOccurs(tokenise("this is his site"), tokenise("hi"))).toBe(false);
  });
});
