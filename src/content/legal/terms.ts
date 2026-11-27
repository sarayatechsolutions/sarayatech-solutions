/**
 * Terms of Use DRAFT copy (STS-037, REQ-046). Rules and the approval switch: ./legal.ts.
 *
 * Plain English for a US small-business audience. Legal wording that only a lawyer can settle
 * (warranty disclaimer, liability limit, governing law) is written plainly AND flagged with a C23
 * placeholder; it is not final until C23 is approved.
 */
import { BUSINESS } from "@/config/business";
import { ownerTodo, PRIVACY_PATH, TERMS_PATH, type LegalDocument } from "./legal";

const contactLink = { text: "contact form", to: "/contact" };

export const TERMS_OF_USE: LegalDocument = {
  path: TERMS_PATH,
  title: "Terms of Use",
  intro: [
    `These terms apply when you use the ${BUSINESS.name} website ${ownerTodo("C1", "legal business name and entity type")}. By using the site, you agree to them. If you don't agree, please don't use the site.`,
  ],
  sections: [
    {
      id: "site-information",
      heading: "Information on this site",
      blocks: [
        {
          p: ["The site describes our services in general terms. It is not an offer or a quote. The scope, price and timing of any work are agreed only in a separate written quote or contract, and that document controls if it differs from anything on this site."],
        },
      ],
    },
    {
      id: "chat-assistant",
      heading: "The Amina chat assistant",
      blocks: [
        {
          ul: [
            ["Amina is an AI assistant. Its answers are generated automatically and can be wrong, out of date or incomplete."],
            ["Its answers are general information, not legal, financial, tax or other professional advice, and they do not create a contract or commit us to a price, a date or a result."],
            ["Please confirm anything important with our team through our ", contactLink, "."],
            [
              "Don't share sensitive information in the chat. Our ",
              { text: "Privacy Policy", to: PRIVACY_PATH },
              " explains how chat messages are handled, including that they are sent to OpenAI to generate replies.",
            ],
          ],
        },
      ],
    },
    {
      id: "acceptable-use",
      heading: "Using the forms and chat responsibly",
      blocks: [
        { p: ["When you use the site, please don't:"] },
        {
          ul: [
            ["send spam, malicious code or someone else's personal information without their permission;"],
            ["try to get around the limits on how often the forms and chat can be used, or overload the site;"],
            ["try to access our systems or data without permission;"],
            ["pretend to be someone else."],
          ],
        },
        { p: ["We may block requests that look automated or abusive."] },
      ],
    },
    {
      id: "our-content",
      heading: "Our content",
      blocks: [
        {
          p: [`The text, design and logos on this site belong to ${BUSINESS.name} or to the people who licensed them to us. Please don't copy them for commercial use without our written permission. Other companies' names and logos belong to their owners.`],
        },
      ],
    },
    {
      id: "other-websites",
      heading: "Links to other websites",
      blocks: [
        {
          p: ["Some pages link to websites we don't run, such as projects we built for clients. We are not responsible for their content or their privacy practices."],
        },
      ],
    },
    {
      id: "no-warranty",
      heading: "No warranty",
      blocks: [
        {
          p: [`We work to keep the site accurate and available, but we provide it "as is", without promises that it will always be available, error-free or complete. ${ownerTodo("C23", "warranty disclaimer wording reviewed by a lawyer")}`],
        },
      ],
    },
    {
      id: "liability",
      heading: "Limitation of liability",
      blocks: [
        {
          p: [`To the extent the law allows, we are not liable for indirect or consequential losses that come from using this site or relying on its content, including the chat assistant's answers. ${ownerTodo("C23", "limitation of liability wording reviewed by a lawyer")}`],
        },
      ],
    },
    {
      id: "governing-law",
      heading: "Governing law",
      blocks: [{ p: [`These terms are governed by ${ownerTodo("C23", "governing state law and the courts for disputes")}.`] }],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      blocks: [{ p: ["If we change these terms, we will post the new version on this page with a new effective date."] }],
    },
    {
      id: "contact",
      heading: "Contact us",
      blocks: [
        {
          p: [
            "Questions about these terms? Send them through our ",
            contactLink,
            `. ${ownerTodo("C3", "contact email for legal questions")}`,
          ],
        },
      ],
    },
  ],
};
