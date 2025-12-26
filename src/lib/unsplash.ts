/**
 * Unsplash Image Utility
 * Generates dynamic images from Unsplash based on solution categories
 */

interface UnsplashImageOptions {
  width?: number;
  height?: number;
  query?: string;
  seed?: string;
}

/**
 * Get a dynamic Unsplash image URL based on search query
 * Uses Unsplash Source API for simple, no-API-key implementation
 */
export const getUnsplashImage = ({
  width = 1200,
  height = 800,
  query = "technology",
  seed,
}: UnsplashImageOptions): string => {
  // Use seed (like solution ID) for consistent images per solution
  const seedParam = seed ? `&sig=${seed}` : "";

  return `https://source.unsplash.com/${width}x${height}/?${query}${seedParam}`;
};

/**
 * Get solution-specific image based on solution category/title
 */
export const getSolutionImage = (solutionId: string, category: string): string => {
  const queryMap: Record<string, string> = {
    "web-mobile-development": "web,development,mobile,coding",
    "ai-automation-chatbots": "artificial,intelligence,robot,automation",
    "data-bi-solutions": "data,analytics,dashboard,charts",
    "custom-business-software": "software,business,computer,code",
    "cloud-infrastructure": "cloud,server,infrastructure,network",
    "digital-strategy-consulting": "strategy,business,planning,team",
    "security-compliance": "security,lock,protection,cyber",
  };

  const query = queryMap[solutionId] || "technology,business";

  return getUnsplashImage({
    width: 1200,
    height: 600,
    query,
    seed: solutionId, // Ensures same image for same solution
  });
};

/**
 * Get a smaller thumbnail version for cards
 */
export const getSolutionThumbnail = (solutionId: string, category: string): string => {
  const queryMap: Record<string, string> = {
    "web-mobile-development": "web,development,mobile,coding",
    "ai-automation-chatbots": "artificial,intelligence,robot,automation",
    "data-bi-solutions": "data,analytics,dashboard,charts",
    "custom-business-software": "software,business,computer,code",
    "cloud-infrastructure": "cloud,server,infrastructure,network",
    "digital-strategy-consulting": "strategy,business,planning,team",
    "security-compliance": "security,lock,protection,cyber",
  };

  const query = queryMap[solutionId] || "technology,business";

  return getUnsplashImage({
    width: 800,
    height: 480,
    query,
    seed: solutionId,
  });
};
