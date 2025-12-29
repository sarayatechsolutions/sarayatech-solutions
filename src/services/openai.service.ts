import OpenAI from "openai";
import { encodeKnowledgeBase } from "@/utils/toon-encoder";

/**
 * OpenAI ChatGPT Integration Service
 * Natural conversation handling with Toon-encoded context for token efficiency
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  message: string;
  tokensUsed?: number;
  error?: string;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private encodedContext: string = "";
  private conversationHistory: ChatMessage[] = [];
  private maxHistoryLength = 10; // Keep last 10 messages for context

  constructor() {
    this.initialize();
  }

  /**
   * Initializes OpenAI client and prepares encoded context
   */
  private initialize() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      console.warn(
        "[OpenAI Service] API key not configured. ChatGPT integration disabled."
      );
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true, // For client-side usage (consider using backend proxy in production)
      });

      // Encode knowledge base once during initialization
      const { toonData, tokenEstimate } = encodeKnowledgeBase();
      this.encodedContext = toonData;

      console.log(
        `[OpenAI Service] Initialized. Context size: ~${tokenEstimate} tokens (Toon-encoded)`
      );
    } catch (error) {
      console.error("[OpenAI Service] Initialization failed:", error);
    }
  }

  /**
   * Checks if OpenAI service is available
   */
  public isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Gets system prompt with Toon-encoded knowledge base
   */
  private getSystemPrompt(): string {
    return `You are Amina, a friendly and knowledgeable AI assistant for SarayaTech Solutions, a leading digital transformation company.

Your role is to help visitors learn about our services, pricing, process, and answer their questions naturally and conversationally.

**IMPORTANT INSTRUCTIONS:**
- Be warm, professional, and helpful
- Provide accurate information based on the context below
- If asked about pricing, provide specific ranges and timelines
- When users describe business problems, match them to our services that solve those problems
- Reference the servicesProblems data to understand which services address specific pain points
- Encourage users to book a consultation for detailed discussions
- Use markdown formatting for better readability (bold, lists, etc.)
- Include relevant links using this format: /solutions, /about, /realisation, /contact
- Keep responses concise but informative (2-4 paragraphs max)
- If you don't know something, offer to connect them with the team

**COMPANY CONTEXT (Toon-encoded for efficiency):**

${this.encodedContext}

**KEY CONTACT INFORMATION:**
- Email: contact@sarayatech.com
- Phone: +1 (614)-783-0443
- Address: 2765 S Hamilton Rd, Columbus, OH 43232, United States
- Calendly: https://calendly.com/saraya-info

Remember: You represent SarayaTech Solutions. Be helpful, accurate, and encourage meaningful engagement.`;
  }

  /**
   * Sends a message to ChatGPT and gets a natural response
   */
  public async chat(userMessage: string): Promise<ChatResponse> {
    if (!this.client) {
      return {
        message:
          "I apologize, but I'm currently unable to connect to my AI brain. Please contact our team directly at contact@sarayatech.com or book a meeting: https://calendly.com/saraya-info",
        error: "OpenAI service not initialized",
      };
    }

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      // Trim history if too long
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(
          -this.maxHistoryLength * 2
        );
      }

      // Prepare messages for API call
      const messages: ChatMessage[] = [
        { role: "system", content: this.getSystemPrompt() },
        ...this.conversationHistory,
      ];

      // Call ChatGPT API
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini", // Fast and cost-effective model
        messages: messages as any,
        temperature: 0.7, // Balanced creativity and consistency
        max_tokens: 500, // Limit response length
        top_p: 0.9,
      });

      const responseMessage =
        completion.choices[0]?.message?.content ||
        "I'm having trouble generating a response. Please try again or contact our team.";

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: responseMessage,
      });

      return {
        message: responseMessage,
        tokensUsed: completion.usage?.total_tokens,
      };
    } catch (error: any) {
      console.error("[OpenAI Service] Chat error:", error);

      // Handle specific error cases
      if (error?.status === 401) {
        return {
          message:
            "Authentication error. Please contact our team at info@sarayatech.com",
          error: "Invalid API key",
        };
      }

      if (error?.status === 429) {
        return {
          message:
            "I'm currently experiencing high demand. Please try again in a moment or contact us directly: https://calendly.com/saraya-info",
          error: "Rate limit exceeded",
        };
      }

      return {
        message:
          "I encountered an error while processing your message. Please try again or reach out to our team at info@sarayatech.com",
        error: error?.message || "Unknown error",
      };
    }
  }

  /**
   * Resets conversation history (useful for new chat sessions)
   */
  public resetConversation() {
    this.conversationHistory = [];
    console.log("[OpenAI Service] Conversation history reset");
  }

  /**
   * Gets current token usage statistics
   */
  public getStats() {
    return {
      contextTokens: Math.ceil(this.encodedContext.length / 4),
      conversationLength: this.conversationHistory.length,
      isAvailable: this.isAvailable(),
    };
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
export default openAIService;
