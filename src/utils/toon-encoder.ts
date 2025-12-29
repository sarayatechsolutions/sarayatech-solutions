import { encode } from '@toon-format/toon';
import knowledgeBase from '@/data/chatbot/knowledge-base.json';
import pricingDetails from '@/data/chatbot/pricing-details.json';
import servicesProblems from '@/data/chatbot/services-problems.json';

/**
 * Toon Encoder Utility
 * Encodes knowledge base and pricing data into Toon format to reduce token usage
 */

export interface EncodedContext {
  toonData: string;
  tokenEstimate: number;
}

/**
 * Encodes the complete knowledge base into Toon format
 */
export function encodeKnowledgeBase(): EncodedContext {
  const combinedData = {
    company: knowledgeBase.company,
    services: knowledgeBase.services,
    process: knowledgeBase.process,
    booking: knowledgeBase.booking,
    pricing: pricingDetails,
    servicesProblems: servicesProblems.services_solutions_map,
  };

  // Encode with custom replacer to optimize data
  const toonData = encode(combinedData, {
    replacer: (key, value) => {
      // Remove unnecessary metadata or very long descriptions if needed
      if (key === 'createdAt' || key === 'updatedAt') {
        return undefined;
      }
      return value;
    }
  });

  // Rough token estimate (Toon format is ~3-4x more efficient than JSON)
  const tokenEstimate = Math.ceil(toonData.length / 4);

  return {
    toonData,
    tokenEstimate
  };
}

/**
 * Encodes specific service information
 */
export function encodeServiceContext(serviceKey: string): string {
  const service = knowledgeBase.services[serviceKey as keyof typeof knowledgeBase.services];

  if (!service) {
    return '';
  }

  return encode(service);
}

/**
 * Encodes pricing information for specific categories
 */
export function encodePricingContext(categories?: string[]): string {
  if (!categories || categories.length === 0) {
    return encode(pricingDetails);
  }

  const selectedPricing: Record<string, any> = {};

  categories.forEach(category => {
    if (category in pricingDetails) {
      selectedPricing[category] = (pricingDetails as any)[category];
    }
  });

  return encode(selectedPricing);
}

/**
 * Encodes company information
 */
export function encodeCompanyContext(): string {
  return encode({
    company: knowledgeBase.company,
    stats: knowledgeBase.company.stats
  });
}

/**
 * Encodes process/workflow information
 */
export function encodeProcessContext(): string {
  return encode({
    process: knowledgeBase.process,
    booking: knowledgeBase.booking
  });
}

/**
 * Encodes services-problems mapping
 * Maps each service to the business problems it solves and target audiences
 */
export function encodeServicesProblemsContext(): string {
  return encode({
    servicesProblems: servicesProblems.services_solutions_map
  });
}
