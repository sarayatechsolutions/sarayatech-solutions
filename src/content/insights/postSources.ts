/**
 * Every draft with its text, whether approved or not. TEST AND OWNER-REVIEW USE ONLY: the app must
 * never import this file (it would put unapproved article text in the public bundle). See posts.ts.
 */
import type { BlogPost } from "./blog";
import { POST_SOURCE as websiteCostColumbus } from "./posts/website-cost-columbus";
import { POST_SOURCE as googleMapsColumbus } from "./posts/google-maps-columbus";
import { POST_SOURCE as websiteFeaturesOhioIndustry } from "./posts/website-features-ohio-industry";
import { POST_SOURCE as smallBusinessApp } from "./posts/small-business-app";
import { POST_SOURCE as facebookInstagramTiktok } from "./posts/facebook-instagram-tiktok";

export const POST_SOURCES: readonly BlogPost[] = [
  websiteCostColumbus,
  googleMapsColumbus,
  websiteFeaturesOhioIndustry,
  smallBusinessApp,
  facebookInstagramTiktok,
];
