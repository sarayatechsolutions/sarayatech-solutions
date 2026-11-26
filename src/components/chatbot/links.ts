/**
 * The chatbot's link policy (STS-058 / REQ-154 / SEC-16) now lives in src/lib/links.ts, shared
 * with the blog body (A7-2). Re-exported here so existing imports and tests keep working.
 */
export { classifyHref, isInternalHref, type LinkTarget } from "@/lib/links";
