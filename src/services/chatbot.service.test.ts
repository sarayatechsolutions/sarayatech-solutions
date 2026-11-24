import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import chatbotService, { CHAT_UNAVAILABLE_MESSAGE } from "./chatbot.service";
import openAIService from "./openai.service";
import knowledgeBase from "@/data/chatbot/knowledge-base.json";

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

describe("chatbot company answer (FE-08: 'undefined active users')", () => {
  it("renders every company stat without an 'undefined' placeholder", async () => {
    const reply = await chatbotService.getResponse("company history");

    expect(reply).toContain("About SarayaTech Solutions");
    expect(reply).not.toMatch(/undefined/i);
    expect(reply).toContain(`${knowledgeBase.company.stats.enterprise_clients} enterprise clients`);
  });
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
