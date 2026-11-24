import { describe, it, expect } from "vitest";
import chatbotService from "./chatbot.service";
import knowledgeBase from "@/data/chatbot/knowledge-base.json";

describe("chatbot company answer (FE-08: 'undefined active users')", () => {
  it("renders every company stat without an 'undefined' placeholder", async () => {
    const reply = await chatbotService.getResponse("company history");

    expect(reply).toContain("About SarayaTech Solutions");
    expect(reply).not.toMatch(/undefined/i);
    expect(reply).toContain(`${knowledgeBase.company.stats.enterprise_clients} enterprise clients`);
  });
});
