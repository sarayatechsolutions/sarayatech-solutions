/**
 * AI chat client: talks to OUR backend (`POST /api/chat`), never to an AI provider.
 *
 * The provider key, model, system prompt and token limits live on the server. The
 * browser sends only the visitor's message and a short, capped history:
 *
 *   request  { message: string 1..1000, history?: [{ role: "user"|"assistant", content ≤2000 }] ≤10 }
 *   response 200 { success: true, reply }   |   400/429/502/503 { success: false, message }
 *
 * Any failure returns `{ error }` so the caller can fall back to local answers.
 * The file keeps its historical name so existing imports do not change.
 */

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  tokensUsed?: number;
  error?: string;
}

export const CHAT_LIMITS = {
  message: 1000,
  historyItems: 10,
  historyContent: 2000,
} as const;

interface ChatClientOptions {
  apiUrl?: string;
  fetchImpl?: typeof fetch;
}

class OpenAIService {
  private conversationHistory: ChatHistoryItem[] = [];
  private readonly options: ChatClientOptions;

  constructor(options: ChatClientOptions = {}) {
    this.options = options;
  }

  private get endpoint(): string {
    const base = this.options.apiUrl ?? (import.meta.env.VITE_API_URL || "");
    return `${base}/api/chat`;
  }

  private get fetcher(): typeof fetch {
    return this.options.fetchImpl ?? fetch;
  }

  /**
   * The last N turns in the exact shape the backend accepts: only user/assistant
   * roles, content 1..2000 characters, at most 10 entries.
   */
  private cappedHistory(): ChatHistoryItem[] {
    return this.conversationHistory
      .filter(
        (item) =>
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          item.content.trim().length > 0,
      )
      .slice(-CHAT_LIMITS.historyItems)
      .map(({ role, content }) => ({
        role,
        content: content.slice(0, CHAT_LIMITS.historyContent),
      }));
  }

  private remember(item: ChatHistoryItem): void {
    this.conversationHistory.push(item);
    if (this.conversationHistory.length > CHAT_LIMITS.historyItems) {
      this.conversationHistory = this.conversationHistory.slice(-CHAT_LIMITS.historyItems);
    }
  }

  public async chat(userMessage: string): Promise<ChatResponse> {
    const message = (userMessage ?? "").trim().slice(0, CHAT_LIMITS.message);
    if (!message) return { message: "", error: "empty_message" };

    let response: Response;
    try {
      response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: this.cappedHistory() }),
      });
    } catch {
      return { message: "", error: "network" };
    }

    if (!response.ok) return { message: "", error: `http_${response.status}` };

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) return { message: "", error: "bad_response" };

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { message: "", error: "bad_response" };
    }

    const reply = (body as { success?: unknown; reply?: unknown } | null) ?? {};
    if (reply.success !== true || typeof reply.reply !== "string" || !reply.reply.trim()) {
      return { message: "", error: "bad_response" };
    }

    // History records only turns the backend actually answered.
    this.remember({ role: "user", content: message });
    this.remember({ role: "assistant", content: reply.reply });
    return { message: reply.reply };
  }

  public resetConversation(): void {
    this.conversationHistory = [];
  }

  public getStats() {
    return {
      // The knowledge-base context is assembled on the server now.
      contextTokens: 0,
      conversationLength: this.conversationHistory.length,
      isAvailable: this.isAvailable(),
    };
  }

  /** Whether a backend call can be attempted; failures are handled per request. */
  public isAvailable(): boolean {
    return typeof this.options.fetchImpl === "function" || typeof fetch === "function";
  }
}

export { OpenAIService };
export const openAIService = new OpenAIService();
export default openAIService;
