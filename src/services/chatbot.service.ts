import knowledgeBase from "@/data/chatbot/knowledge-base.json";
import intentsData from "@/data/chatbot/intents.json";
import servicesProblems from "@/data/chatbot/services-problems.json";
import openAIService from "./openai.service";

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
}

interface IntentMatch {
  intent: Intent;
  score: number;
  confidence: number;
}

/** Shown when neither the AI backend nor a local answer is available. */
export const CHAT_UNAVAILABLE_MESSAGE =
  "Chat is unavailable right now — use the contact form or book a call.";

/** The only pricing statement the bot makes: no figures, packages or terms. */
export const PRICING_REPLY = "Packages are quoted after a free consultation.";

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

  constructor() {
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
   * Normalizes text for better matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/sarayatech|saraya tech/g, "") // Remove company name to avoid interference
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  }

  /**
   * Calculates the intent score based on keyword matching with weights
   */
  private calculateIntentScore(userMessage: string, intent: Intent): number {
    const normalizedMessage = this.normalizeText(userMessage);
    let totalScore = 0;

    intent.keywords.forEach(({ word, weight }) => {
      const normalizedKeyword = this.normalizeText(word);

      // Exact match
      if (normalizedMessage.includes(normalizedKeyword)) {
        totalScore += weight;
      }
      // Partial match (word boundaries)
      else {
        const words = normalizedMessage.split(" ");
        const keywordWords = normalizedKeyword.split(" ");

        keywordWords.forEach(kw => {
          if (words.some(w => w.includes(kw) || kw.includes(w))) {
            totalScore += weight * 0.5; // Partial match gets half weight
          }
        });
      }
    });

    return totalScore;
  }

  /**
   * Detects user intent from message
   */
  private detectIntent(userMessage: string): IntentMatch | null {
    const intentMatches: IntentMatch[] = [];

    this.intents.forEach(intent => {
      const score = this.calculateIntentScore(userMessage, intent);

      if (score >= intent.threshold) {
        const maxPossibleScore = intent.keywords.reduce((sum, kw) => sum + kw.weight, 0);
        const confidence = Math.min((score / maxPossibleScore) * 100, 100);

        intentMatches.push({
          intent,
          score,
          confidence
        });
      }
    });

    // Sort by score descending
    intentMatches.sort((a, b) => b.score - a.score);

    // Debug log (can be removed in production)
    if (intentMatches.length > 0) {
      console.debug('[Amina] Detected intents:',
        intentMatches.map(m => ({
          id: m.intent.id,
          score: m.score,
          confidence: m.confidence.toFixed(1) + '%'
        }))
      );
    }

    // Return the best match if any
    return intentMatches.length > 0 ? intentMatches[0] : null;
  }

  /**
   * Generates response for services general inquiry
   */
  private generateServicesResponse(): string {
    const services = Object.values(this.knowledgeBase.services);
    const servicesList = services.map(s => `• **${s.name}**: ${s.description}`).join("\n");

    return `We offer a comprehensive range of digital solutions:\n\n${servicesList}\n\nWhich service interests you? I'd be happy to provide more details!\n\n🔗 **Explore all our services:** /solutions`;
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

    response += `🔗 **View all our solutions:** /solutions\n\n`;
    response += `Would you like to schedule a consultation to discuss your specific needs? Book here: ${this.knowledgeBase.company.contact.calendly}`;

    return response;
  }

  /**
   * Generates response for pricing inquiry
   */
  private generatePricingResponse(): string {
    // No published price list: every figure is quoted per project.
    return `${PRICING_REPLY}\n\n` +
      `🔗 **Contact us:** /contact\n` +
      `📅 **Book a free consultation:** ${this.bookingLink()}`;
  }

  private bookingLink(): string {
    return this.knowledgeBase.company.contact.calendly || "https://calendly.com/saraya-info";
  }

  /**
   * Generates response for contact inquiry
   */
  private generateContactResponse(): string {
    const contact = this.knowledgeBase.company.contact;
    return `You can reach us through:\n\n` +
      `📧 **Email:** ${contact.email}\n` +
      `📞 **Phone:** ${contact.phone}\n` +
      `📍 **Address:** ${contact.address.full}\n` +
      `📅 **Book a Meeting:** ${contact.calendly}\n\n` +
      `🔗 **Visit our contact page:** /contact\n\n` +
      `We're available to discuss your project and answer any questions. What works best for you?`;
  }

  /**
   * Generates response for booking inquiry
   */
  private generateBookingResponse(): string {
    return this.knowledgeBase.booking.message + "\n\n" + this.knowledgeBase.booking.alternative;
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
    response += `Ready to get started? Let's schedule a consultation: ${this.knowledgeBase.company.contact.calendly}`;

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
      `🔗 **View our case studies:** /realisation`;
  }

  /**
   * Generates response for payment inquiry
   */
  private generatePaymentResponse(): string {
    return `${PRICING_REPLY} Payment terms are agreed in that quote.\n\n` +
      `🔗 **Contact us:** /contact\n` +
      `📅 **Book a free consultation:** ${this.bookingLink()}`;
  }

  /**
   * Generates response for contract inquiry
   */
  private generateContractResponse(): string {
    return `**Our Contract & Terms**\n\n` +
      `We believe in transparent, fair agreements:\n\n` +
      `• **Clear Scope**: Detailed project scope with deliverables and timelines\n` +
      `• **Intellectual Property**: You own all code and assets upon final payment\n` +
      `• **Confidentiality**: NDA protection for your business ideas and data\n` +
      `• **Revisions**: Agreed-upon revision rounds included in the scope\n\n` +
      `🔗 **Contact us for contract details:** /contact\n\n` +
      `We're happy to review our standard agreement or work with your legal team. Book a consultation: ${this.bookingLink()}`;
  }

  /**
   * Generates response for support inquiry
   */
  private generateSupportResponse(): string {
    return `**Post-Launch Support & Maintenance**\n\n` +
      `We can support your solution after launch. The scope of that support is agreed with you during a free consultation and included in your quote.\n\n` +
      `🔗 **Learn more:** /solutions\n` +
      `🔗 **Contact us:** /contact\n\n` +
      `Need ongoing support? Let's discuss: ${this.bookingLink()}`;
  }

  /**
   * Generates response matching business problems to solutions
   */
  private generateProblemSolutionResponse(userMessage: string): string {
    const normalizedMessage = this.normalizeText(userMessage);

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
      if (keywords.some(keyword => normalizedMessage.includes(keyword.toLowerCase()))) {
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
    response += `\n\n🔗 **Explore all solutions:** /solutions\n`;
    response += `🔗 **Get a custom quote:** /contact\n\n`;
    response += `Want to discuss which solution fits your specific situation? Book a free consultation: ${this.knowledgeBase.company.contact.calendly}`;

    return response;
  }

  /**
   * Generates default response
   */
  private generateDefaultResponse(): string {
    return `That's a great question! While I'm still learning, I'd be happy to connect you with our team who can provide detailed answers.\n\n` +
      `🔗 **Explore our services:** /solutions\n` +
      `🔗 **Learn about us:** /about\n` +
      `🔗 **View our projects:** /realisation\n` +
      `🔗 **Get in touch:** /contact\n\n` +
      `You can also reach us directly:\n` +
      `📧 **Email:** ${this.knowledgeBase.company.contact.email}\n` +
      `📍 **Address:** ${this.knowledgeBase.company.contact.address.city}, ${this.knowledgeBase.company.contact.address.state}\n` +
      `📅 **Book a meeting:** ${this.knowledgeBase.company.contact.calendly}\n\n` +
      `What else would you like to know about SarayaTech?`;
  }

  /**
   * Main method to get response from user message
   * Now supports both ChatGPT (natural responses) and intent-based (fallback)
   */
  public async getResponse(userMessage: string): Promise<string> {
    // AI answers come from our backend (/api/chat); the browser holds no provider key.
    if (this.useOpenAI && openAIService.isAvailable()) {
      try {
        const response = await openAIService.chat(userMessage);
        if (!response.error) return response.message;
        // Log the failure class only, never the visitor's message.
        console.warn('[Chatbot] AI backend unavailable, using local answers:', response.error);
      } catch {
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
        return this.generateContactResponse();

      case "booking":
        return this.generateBookingResponse();

      case "process":
      case "timeline":
        return this.generateProcessResponse();

      case "portfolio":
      case "location":
      case "company_info":
      case "experience":
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
      "Tell me about AI automation",
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
      { label: "📅 Book a Meeting", message: "I'd like to schedule a consultation" },
      { label: "💼 Our Services", message: "What services do you offer?" },
      { label: "💰 Pricing", message: "How much does it cost?" },
      { label: "📞 Contact", message: "How can I contact you?" }
    ];
  }
}

// Export singleton instance
export const chatbotService = new ChatbotService();
export default chatbotService;
