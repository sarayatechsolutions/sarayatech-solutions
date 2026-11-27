/**
 * The blog posts the app can publish (STS-055). Each module exports `POST`, which is null until the
 * owner flips that module's APPROVED flag, so an unapproved draft is not routed, prerendered, listed
 * or even bundled. `PUBLISHED_POSTS` also re-checks every rule in blog.ts (placeholders, date, slug).
 *
 * Tests read the drafts through `postSources.ts`, which the app never imports.
 */
import { publishedPosts, type BlogPost } from "./blog";
import { POST as websiteCostColumbus } from "./posts/website-cost-columbus";
import { POST as googleMapsColumbus } from "./posts/google-maps-columbus";
import { POST as websiteFeaturesOhioIndustry } from "./posts/website-features-ohio-industry";
import { POST as smallBusinessApp } from "./posts/small-business-app";
import { POST as facebookInstagramTiktok } from "./posts/facebook-instagram-tiktok";

/** Every post module, approved or not (null = not approved). */
export const POST_MODULES: readonly (BlogPost | null)[] = [
  websiteCostColumbus,
  googleMapsColumbus,
  websiteFeaturesOhioIndustry,
  smallBusinessApp,
  facebookInstagramTiktok,
];

/** The posts that are public today: none, until the owner approves one. */
export const PUBLISHED_POSTS: readonly BlogPost[] = publishedPosts(POST_MODULES);
