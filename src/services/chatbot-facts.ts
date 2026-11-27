/**
 * Business facts the chatbot states, built ONLY from src/config/business.ts (STS-058 / REQ-154).
 *
 * The chatbot's JSON knowledge base no longer holds any contact, location, booking or social
 * fact. Every such answer is assembled here from the config helpers, so publishing a fact is a
 * one-line change in business.ts and an unconfirmed fact can never reach a visitor:
 *
 *  - null or unverified value  -> not mentioned; the visitor is sent to the contact form.
 *  - no confirmed address      -> the service-area line ("Serving Columbus, OH and central Ohio").
 *
 * Every function takes the config as an optional argument (as the business.ts helpers do) so
 * tests can pass a populated config without mutating the shared constant.
 */
import {
  BUSINESS,
  CONTACT_PATH,
  bookingHref,
  emailHref,
  hasAddress,
  hasEmail,
  hasPhone,
  hasVerifiedBooking,
  phoneHref,
  socialLinks,
} from "@/config/business";

/** The config shape the business.ts helpers accept. */
export type BusinessFacts = NonNullable<Parameters<typeof hasPhone>[0]>;

const cfg = (c?: BusinessFacts): BusinessFacts => c ?? (BUSINESS as unknown as BusinessFacts);

/** Markdown link to the contact form: always internal, always safe. */
export const CONTACT_FORM_LINK = `[contact form](${CONTACT_PATH})`;

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  facebook: "Facebook",
  youtube: "YouTube",
};

/** The confirmed street address, or the service-area line when none is confirmed. */
export function locationLine(c?: BusinessFacts): string {
  const lines = hasAddress(c) ? cfg(c).address?.lines ?? [] : [];
  return lines.length > 0 ? lines.join(", ") : BUSINESS.serviceAreaText;
}

/** One call to action for booking: the verified booking URL, otherwise the contact form. */
export function bookingCta(c?: BusinessFacts): string {
  return hasVerifiedBooking(c)
    ? `Book a free consultation here: ${bookingHref(c)}`
    : `Request a free consultation through our ${CONTACT_FORM_LINK}.`;
}

/** The contact lines that are confirmed in config, in a fixed order. Never an empty label. */
function confirmedContactLines(c?: BusinessFacts): string[] {
  const lines: string[] = [];
  if (hasEmail(c) && emailHref(c)) lines.push(`📧 **Email:** ${cfg(c).email}`);
  if (hasPhone(c) && phoneHref(c)) lines.push(`📞 **Phone:** ${cfg(c).phone?.display || cfg(c).phone?.tel}`);
  lines.push(`📍 **${hasAddress(c) ? "Address" : "Service area"}:** ${locationLine(c)}`);
  if (hasVerifiedBooking(c)) lines.push(`📅 **Book a meeting:** ${bookingHref(c)}`);
  const social = socialLinks(c);
  if (social.length > 0) {
    lines.push(`🔗 **Follow us:** ${social.map(([net, url]) => `${SOCIAL_LABELS[net] ?? net}: ${url}`).join(" · ")}`);
  }
  return lines;
}

/** "How can I contact you?" */
export function contactReply(c?: BusinessFacts): string {
  return (
    `The best way to reach us is our ${CONTACT_FORM_LINK}: tell us about your project and the team will get back to you.\n\n` +
    `${confirmedContactLines(c).join("\n")}\n\n` +
    `What would you like to discuss?`
  );
}

/** "Where are you located?" */
export function locationReply(c?: BusinessFacts): string {
  const where = hasAddress(c)
    ? `Our office is at **${locationLine(c)}**.`
    : `${BUSINESS.serviceAreaText}.`;
  return (
    `${where}\n\n` +
    `To meet the team or ask about your area, use our ${CONTACT_FORM_LINK}.`
  );
}

/** "I'd like to book a meeting." */
export function bookingReply(c?: BusinessFacts): string {
  const how = hasVerifiedBooking(c)
    ? `You can pick a time that suits you here: ${bookingHref(c)}`
    : `Send us a request through our ${CONTACT_FORM_LINK} and the team will get back to you to arrange a time.`;
  return `I'd be happy to help you set up a free consultation with our team!\n\n${how}`;
}

/** The facts block used at the end of the default answer (only the location when nothing else is confirmed). */
export function reachUsBlock(c?: BusinessFacts): string {
  const lines = confirmedContactLines(c);
  return lines.length > 1 ? `You can also reach us directly:\n${lines.join("\n")}` : lines.join("\n");
}
