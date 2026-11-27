// Test fixtures for the chatbot facts (STS-058). Imported by tests only.
import { expect } from "vitest";
import type { BusinessFacts } from "./chatbot-facts";

/** The facts the old knowledge base hard-coded. None is confirmed in config (06 C2-C4, C15, C19). */
export const STALE_FACTS = [
  /783-0443/,
  /\b614\b/,
  /info@saraya\.tech/i,
  /sarayatech\.com/i,
  /Hamilton/i,
  /43232/,
  /calendly/i,
  /Senegal/i,
  /operate globally|distributed team|worldwide|international clients/i,
  /linkedin/i,
  /twitter/i,
  /@sarayatech/i,
];

export function expectNoStaleFacts(text: string) {
  expect(text.length).toBeGreaterThan(0);
  for (const fact of STALE_FACTS) expect(text).not.toMatch(fact);
  expect(text).not.toMatch(/undefined|\bnull\b/);
  expect(text).not.toMatch(/\*\*[^*]+:\*\*\s*$/m); // never a label with nothing after it
}

/** Obviously fake values: tests must never put a would-be real fact in the code. */
export const POPULATED: BusinessFacts = {
  phone: { display: "(555) 010-0199", tel: "+15550100199" },
  email: "hello@example.test",
  address: { lines: ["1 Example Way", "Columbus, OH 00000"] },
  hours: null,
  booking: { url: "https://booking.example.test/saraya", verified: true },
  social: { linkedin: "https://social.example.test/saraya", twitter: undefined },
};

export const SERVICE_AREA = "Serving Columbus, OH and central Ohio";
