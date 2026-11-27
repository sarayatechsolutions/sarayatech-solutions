import knowledgeBase from "@/data/chatbot/knowledge-base.json";
import intentsData from "@/data/chatbot/intents.json";
import servicesProblems from "@/data/chatbot/services-problems.json";
import openAIService from "./openai.service";
import {
  bookingCta,
  bookingReply,
  contactReply,
  locationReply,
  type BusinessFacts,
} from "./chatbot-facts";

interface KeywordWeight {
  word: string;
  weight: number;
}

interface Intent {
  id: string;
  name: string;
  keywords: KeywordWeight[];
  threshold: number;
  context?: string;
  responses?: string[];
  /**
   * Narrow, phrase-driven topics (technology, integrations, site speed). A priority intent scores
   * on whole-keyword hits only (no partial-word credit) and, once it passes its threshold, wins
   * over broad intents such as website design or local SEO, which collect many partial-word
   * points and would otherwise take the question.
   */
  priority?: number;
}

interface IntentMatch {
  intent: Intent;
  score: number;
  confidence: number;
}

/** Shown when neither the AI backend nor a local answer is available. */
export const CHAT_UNAVAILABLE_MESSAGE =
  "Chat is unavailable right now. Please use the [contact form](/contact) and we will reply by email.";

/**
 * FF-4: the honest "I don't know" answer, used when no local answer matches. It never guesses and
 * never greets; it hands over to a person through the contact form or the free audit.
 */
export const CHAT_FALLBACK_REPLY =
  "I'm not sure I can answer that one here, and I'd rather not guess.\n\n" +
  "A person on our team can help:\n\n" +
  "- Send your question through the [contact form](/contact) and we will reply by email.\n" +
  "- Or request a [free audit](/free-audit) of your website.";

/** The only pricing statement the bot makes: no figures, packages or terms. */
export const PRICING_REPLY = "Packages are quoted after a free consultation.";

/** Words too short or too common to count as a partial keyword match. */
const FILLER_WORDS = new Set([
  "the", "and", "you", "your", "are", "can", "how", "what", "who", "why", "when", "does", "for",
  "with", "our", "about", "like", "would", "could", "should", "will", "have", "has", "this", "that",
  "there", "their", "from", "into", "want", "need", "please", "tell", "know", "get", "they", "them",
  "which", "whats",
]);
/**
 * FF-4: partial credit needs at least 4 letters. Three-letter keywords such as "sup", "hey" or
 * "app" matched inside "support", "they" or "happy"; they still count as whole words.
 */
const isMeaningfulWord = (w: string) => w.length >= 4 && !FILLER_WORDS.has(w);

/**
 * FF-4: one normalisation for messages and keywords alike. Lowercase, accents folded ("café" ->
 * "cafe"), curly apostrophes straightened and dropped inside a word ("what's" -> "whats", so
 * "What’s up" and "whats up" match the same keyword), the company name removed, everything
 * else that is not a letter or digit turned into a word break.
 */
export function normaliseForMatching(text: string): string {
  return (text ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc`]/g, "'")
    .replace(/sarayatech|saraya tech/g, " ")
    .replace(/([a-z0-9])'([a-z0-9])/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The normalised message as whole words. */
export function tokenise(text: string): string[] {
  const normalised = normaliseForMatching(text);
  return normalised ? normalised.split(" ") : [];
}

/** True when the phrase's words appear in the message as a contiguous run of whole words. */
export function phraseOccurs(message: string[], phrase: string[]): boolean {
  if (phrase.length === 0 || phrase.length > message.length) return false;
  outer: for (let i = 0; i + phrase.length <= message.length; i++) {
    for (let j = 0; j < phrase.length; j++) {
      if (!sameWord(message[i + j], phrase[j])) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Whole-word equality with plural tolerance: "costs" is "cost", "websites" is "website",
 * "businesses" is "business". Words under 3 letters must match exactly, so "hi" is never "his".
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  if (short.length < 3) return false;
  return long === `${short}s` || long === `${short}es`;
}

/**
 * Partial credit between two meaningful (4+ letter) words: one is the start of the other
 * ("website" / "websites"), or both share a 5+ letter stem ("developing" / "development"). A word
 * found INSIDE another ("chain" in "blockchain") is not a match.
 */
function sharesStem(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  if (long.startsWith(short)) return true;
  let common = 0;
  while (common < short.length && short[common] === long[common]) common++;
  return common >= 5 && common >= short.length - 3;
}

/** Common superset of the per-service shapes in knowledge-base.json. */
interface ServiceInfo {
  name: string;
  description: string;
  features?: string[];
  technologies?: string[];
  pricing_range?: string;
  benefits?: string[];
}

/**
 * Chatbot Service
 * Intelligent chatbot service with NLP capabilities for intent detection and response generation
 */
class ChatbotService {
  private intents: Intent[];
  private knowledgeBase: typeof knowledgeBase;
  private servicesProblems: typeof servicesProblems;
  private useOpenAI: boolean = true; // Toggle to enable/disable ChatGPT
  /**
   * Contact, location, booking and social facts come from src/config/business.ts, never from
   * the JSON knowledge base (STS-058). Undefined = the shared BUSINESS config.
   */
  private readonly business?: BusinessFacts;

  constructor(business?: BusinessFacts) {
    this.business = business;
    this.intents = intentsData.intents as Intent[];
    this.knowledgeBase = knowledgeBase;
    this.servicesProblems = servicesProblems;

    // Check if OpenAI is available
    if (!openAIService.isAvailable()) {
      console.log('[Chatbot] OpenAI not available, falling back to intent-based responses');
      this.useOpenAI = false;
    }
  }

  /**
   * Scores one intent against a message. FF-4: every keyword is matched on WORD boundaries over
   * normalised tokens (see normaliseForMatching / phraseOccurs), never as a raw substring, so
   * "hi" no longer fires inside "this", "which" or "blockchain", "yo" inside "your", "sup" inside
   * "support" or "hey" inside "they".
   *
   * A keyword that is not present as a phrase can still earn half its weight per word that a
   * message word shares a stem with (see sharesStem: "websites" for "website", "developing" for
   * "development"). Priority intents score on whole-phrase hits only.
   */
  private calculateIntentScore(userMessage: string, intent: Intent, exactOnly = false): number {
    const messageTokens = tokenise(userMessage);
    const partialTokens = messageTokens.filter(isMeaningfulWord);
    let totalScore = 0;

    for (const { word, weight } of intent.keywords) {
      const keywordTokens = tokenise(word);
      if (keywordTokens.length === 0) continue;

      if (phraseOccurs(messageTokens, keywordTokens)) {
        totalScore += weight;
        continue;
      }
      // Priority intents are phrase-driven: no partial credit, or broad intents' leftovers leak in.
      if (exactOnly) continue;

      // Partial credit, half weight per keyword word. Short and filler words never count: "i",
      // "a" or "you" would otherwise match nearly every keyword.
      for (const kw of keywordTokens.filter(isMeaningfulWord)) {
        if (partialTokens.some((w) => sharesStem(w, kw))) totalScore += weight * 0.5;
      }
    }

    return totalScore;
  }

  /**
   * Detects user intent from message
   */
  private detectIntent(userMessage: string): IntentMatch | null {
    const intentMatches: IntentMatch[] = [];

    for (const intent of this.intents) {
      // An intent with no keywords (out_of_scope) used to "match" every message with score 0, which
      // made the problem-to-solution answer and the fallback below unreachable. Nothing that scored
      // nothing is a match.
      if (intent.keywords.length === 0) continue;
      const score = this.calculateIntentScore(userMessage, intent, (intent.priority ?? 0) > 0);
      if (score <= 0 || score < intent.threshold) continue;

      const maxPossibleScore = intent.keywords.reduce((sum, kw) => sum + kw.weight, 0);
      intentMatches.push({ intent, score, confidence: Math.min((score / maxPossibleScore) * 100, 100) });
    }

    // Priority tier first, then score descending. (The debug log that echoed every visitor's
    // intent scores to the console is gone.)
    intentMatches.sort(
      (a, b) => (b.intent.priority ?? 0) - (a.intent.priority ?? 0) || b.score - a.score
    );

    return intentMatches[0] ?? null;
  }

  /**
   * Generates response for services general inquiry
   */
  private generateServicesResponse(): string {
    const services = Object.values(this.knowledgeBase.services);
    const servicesList = services.map(s => `• **${s.name}**: ${s.description}`).join("\n");

    return `We offer a comprehensive range of digital solutions:\n\n${servicesList}\n\nWhich service interests you? I'd be happy to provide more details!\n\n🔗 **Explore all our services:** /services`;
  }

  /**
   * Generates response for specific service
   */
  private generateServiceDetailResponse(context: string): string {
    const serviceKey = context as keyof typeof this.knowledgeBase.services;
    // The knowledge base is a union of per-service shapes; read it through the
    // common superset so optional fields (features, technologies) type-check.
    const service = this.knowledgeBase.services[serviceKey] as ServiceInfo | undefined;

    if (!service) return this.generateDefaultResponse();

    let response = `**${service.name}**\n\n${service.description}\n\n`;

    if (service.features) {
      response += `**Key Features:**\n${service.features.map(f => `• ${f}`).join("\n")}\n\n`;
    }

    if (service.technologies) {
      response += `**Technologies:** ${service.technologies.join(", ")}\n\n`;
    }

    // No published prices: never print a figure from the knowledge base.
    response += `**Pricing:** ${PRICING_REPLY}\n\n`;

    if (service.benefits) {
      response += `**Benefits:**\n${service.benefits.map(b => `• ${b}`).join("\n")}\n\n`;
    }

    response += `🔗 **View all our solutions:** /services\n\n`;
    response += `Would you like to discuss your specific needs? ${bookingCta(this.business)}`;

    return response;
  }

  /**
   * Generates response for pricing inquiry
   */
  private generatePricingResponse(): string {
    // No published price list: every figure is quoted per project.
    return `${PRICING_REPLY}\n\n` +
      `🔗 **See our packages:** /pricing\n` +
      `🔗 **Contact us:** /contact\n` +
      `📅 ${bookingCta(this.business)}`;
  }

  /**
   * Generates response for contact inquiry
   */
  private generateContactResponse(): string {
    return contactReply(this.business);
  }

  /**
   * Generates response for location inquiry (config-driven: address or service area)
   */
  private generateLocationResponse(): string {
    return locationReply(this.business);
  }

  /**
   * Generates response for booking inquiry
   */
  private generateBookingResponse(): string {
    return bookingReply(this.business);
  }

  /**
   * Generates response for process inquiry
   */
  private generateProcessResponse(): string {
    const process = this.knowledgeBase.process;
    const steps = Object.values(process);

    let response = `Our proven process ensures successful project delivery:\n\n`;
    steps.forEach(step => {
      response += `**${step.step}. ${step.name}**\n`;
      response += `${step.description}\n`;
      response += `⏱️ Duration: ${step.duration}\n\n`;
    });

    response += `🔗 **Learn more about us:** /about\n\n`;
    response += `Ready to get started? ${bookingCta(this.business)}`;

    return response;
  }

  /**
   * Generates response for company inquiry
   */
  private generateCompanyResponse(): string {
    const company = this.knowledgeBase.company;

    return `**About SarayaTech Solutions**\n\n` +
      `${company.description}\n\n` +
      `🔗 **Learn more about our team:** /about\n` +
      `🔗 **View our case studies:** /our-work`;
  }

  /**
   * Generates response for payment inquiry
   */
  private generatePaymentResponse(): string {
    return `${PRICING_REPLY} Payment terms are agreed in that quote.\n\n` +
      `🔗 **Contact us:** /contact\n` +
      `📅 ${bookingCta(this.business)}`;
  }

  /**
   * Generates response for contract inquiry
   */
  private generateContractResponse(): string {
    // OWNER REVIEW: the site has no confirmed contract wording. Make no commitment on ownership,
    // confidentiality or revisions here; the written proposal is where they are set out.
    return `**Scope, ownership and payment terms**\n\n` +
      `We set out the scope, ownership and payment terms in a written proposal that you see before any work starts.\n\n` +
      `🔗 **Contact us for details:** /contact\n\n` +
      `Questions about the proposal? ${bookingCta(this.business)}`;
  }

  /**
   * Generates response for support inquiry
   */
  private generateSupportResponse(): string {
    return `**Post-Launch Support & Maintenance**\n\n` +
      `We can support your solution after launch. The scope of that support is agreed with you during a free consultation and included in your quote.\n\n` +
      `🔗 **Learn more:** /services\n` +
      `🔗 **Contact us:** /contact\n\n` +
      `Need ongoing support? ${bookingCta(this.business)}`;
  }

  /**
   * Generates response matching business problems to solutions
   */
  private generateProblemSolutionResponse(userMessage: string): string {
    const messageTokens = tokenise(userMessage);

    // Problem keywords mapping
    const problemKeywords = {
      'online presence': ['online presence', 'visibility', 'not found online', 'invisible', 'no website'],
      'lead generation': ['lead', 'conversion', 'not converting', 'generate leads', 'sales'],
      'sales channels': ['sales channel', 'reach customers', 'global market', 'e-commerce'],
      'customer engagement': ['engagement', 'retention', 'interact', 'customer service'],
      'repetitive queries': ['repetitive', 'same questions', 'support queries', 'automated support'],
      'scalability': ['scale', 'peak loads', 'infrastructure', 'growth'],
      'legacy system': ['legacy', 'outdated', 'monolithic', 'technical debt'],
      'mobile access': ['mobile', 'field operations', 'remote access'],
      'email marketing': ['email', 'open rates', 'marketing automation'],
      'internal knowledge': ['knowledge base', 'onboarding', 'employee training'],
    };

    // Find matching problems
    const matchedProblems: string[] = [];
    for (const [problem, keywords] of Object.entries(problemKeywords)) {
      if (keywords.some(keyword => phraseOccurs(messageTokens, tokenise(keyword)))) {
        matchedProblems.push(problem);
      }
    }

    if (matchedProblems.length === 0) {
      return ''; // No problem match, will use default response
    }

    // Build response with relevant services
    let response = `Based on your needs, here are solutions that can help:\n\n`;

    const servicesMap = this.servicesProblems.services_solutions_map;
    const recommendations: string[] = [];

    // Search through all services for matching problems
    servicesMap.forEach(category => {
      category.services.forEach(service => {
        const problemText = service.problem_resolved.toLowerCase();

        // Check if any matched problem is addressed by this service
        const isRelevant = matchedProblems.some(problem =>
          problemKeywords[problem as keyof typeof problemKeywords].some(keyword =>
            problemText.includes(keyword.toLowerCase())
          )
        );

        if (isRelevant) {
          recommendations.push(
            `**${service.service_name}** (${category.category})\n` +
            `• Solves: ${service.problem_resolved}\n` +
            `• Ideal for: ${service.target_audience}`
          );
        }
      });
    });

    if (recommendations.length === 0) {
      return '';
    }

    response += recommendations.slice(0, 3).join('\n\n');
    response += `\n\n🔗 **Explore all solutions:** /services\n`;
    response += `🔗 **Get a custom quote:** /contact\n\n`;
    response += `Want to discuss which solution fits your specific situation? ${bookingCta(this.business)}`;

    return response;
  }

  /**
   * The fallback when no local answer fits (FF-4). It says so plainly and offers the two routes a
   * person answers: the contact form and the free audit.
   */
  private generateDefaultResponse(): string {
    return CHAT_FALLBACK_REPLY;
  }

  /**
   * The answer to one visitor message: the AI backend's reply, else a local answer, else the
   * unavailable message.
   *
   * FF-6: pass `signal` to cancel. A cancelled request rejects with an AbortError and never falls
   * back to a local answer, so a reply the visitor no longer waits for is not shown.
   */
  public async getResponse(userMessage: string, options: { signal?: AbortSignal } = {}): Promise<string> {
    const { signal } = options;
    const throwIfAborted = () => {
      if (signal?.aborted) throw new DOMException("The chat request was cancelled.", "AbortError");
    };
    throwIfAborted();

    // AI answers come from our backend (/api/chat); the browser holds no provider key.
    if (this.useOpenAI && openAIService.isAvailable()) {
      try {
        const response = await openAIService.chat(userMessage, { signal });
        if (!response.error) return response.message;
        throwIfAborted();
        // Log the failure class only, never the visitor's message.
        console.warn('[Chatbot] AI backend unavailable, using local answers:', response.error);
      } catch {
        throwIfAborted();
        console.warn('[Chatbot] AI backend call failed, using local answers');
      }
    }

    // Fallback: local rule-based answers.
    try {
      const local = this.getIntentBasedResponse(userMessage);
      if (local && local.trim()) return local;
    } catch {
      // fall through to the unavailable message
    }
    return CHAT_UNAVAILABLE_MESSAGE;
  }

  /**
   * Legacy intent-based response system (now used as fallback)
   */
  private getIntentBasedResponse(userMessage: string): string {
    // Detect intent
    const intentMatch = this.detectIntent(userMessage);

    if (!intentMatch) {
      // Try problem-based matching before default response
      const problemResponse = this.generateProblemSolutionResponse(userMessage);
      if (problemResponse) {
        return problemResponse;
      }
      return this.generateDefaultResponse();
    }

    const { intent } = intentMatch;

    // Package bundles are a pricing question: never replay the canned price list.
    if (intent.id === "packages") return this.generatePricingResponse();

    // Return direct response if available
    if (intent.responses && intent.responses.length > 0) {
      const randomIndex = Math.floor(Math.random() * intent.responses.length);
      return intent.responses[randomIndex];
    }

    // Generate contextual response based on intent
    switch (intent.id) {
      case "services_general":
        return this.generateServicesResponse();

      case "web_development":
      case "ai_chatbot":
      case "data_analytics":
      case "cloud_services":
      case "custom_solution":
      case "security":
        return this.generateServiceDetailResponse(intent.context!);

      case "pricing":
        return this.generatePricingResponse();

      case "contact":
      case "contact_channels":
        return this.generateContactResponse();

      case "booking":
        return this.generateBookingResponse();

      case "process":
      case "timeline":
        return this.generateProcessResponse();

      case "location":
        return this.generateLocationResponse();

      case "portfolio":
      case "company_info":
      case "experience":
      case "team":
        return this.generateCompanyResponse();

      case "payment":
        return this.generatePaymentResponse();

      case "contract":
        return this.generateContractResponse();

      case "support":
        return this.generateSupportResponse();

      case "problem_online_presence":
      case "problem_lead_generation":
      case "problem_customer_engagement":
      case "problem_automation":
      case "problem_scalability":
      case "problem_legacy_systems":
        return this.generateProblemSolutionResponse(userMessage);

      default:
        return this.generateDefaultResponse();
    }
  }

  /**
   * Resets conversation context (useful for ChatGPT mode)
   */
  public resetConversation(): void {
    if (this.useOpenAI) {
      openAIService.resetConversation();
    }
  }

  /**
   * Toggles between ChatGPT and intent-based modes
   */
  public toggleMode(useOpenAI: boolean): void {
    if (useOpenAI && !openAIService.isAvailable()) {
      console.warn('[Chatbot] Cannot enable OpenAI mode - service not available');
      return;
    }
    this.useOpenAI = useOpenAI;
    console.log(`[Chatbot] Mode switched to: ${useOpenAI ? 'ChatGPT' : 'Intent-based'}`);
  }

  /**
   * Gets current chatbot mode and stats
   */
  public getStatus() {
    return {
      mode: this.useOpenAI ? 'ChatGPT' : 'Intent-based',
      openAIAvailable: openAIService.isAvailable(),
      stats: openAIService.getStats()
    };
  }

  /**
   * Get suggested questions
   */
  public getSuggestedQuestions(): string[] {
    return [
      "What services do you offer?",
      "Tell me about local SEO",
      "How much does a website cost?",
      "How can I contact you?",
      "What is your development process?",
      "Do you offer support after launch?"
    ];
  }

  /**
   * Get quick actions
   */
  public getQuickActions(): { label: string; message: string }[] {
    return [
      // FD-31: no emoji (each chip draws one lucide icon). "Request a consultation" until booking
      // is verified in src/config/business.ts; its answer is bookingReply(), which follows config.
      { label: "Request a consultation", message: "I'd like to schedule a consultation" },
      { label: "Our services", message: "What services do you offer?" },
      { label: "Pricing", message: "How much does it cost?" },
      { label: "Contact", message: "How can I contact you?" }
    ];
  }
}

// Export singleton instance (reads the shared BUSINESS config). The class is exported so tests
// can build an instance over a populated config.
export { ChatbotService };
export const chatbotService = new ChatbotService();
export default chatbotService;
