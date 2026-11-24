/**
 * Privacy Policy DRAFT copy (STS-037, REQ-046). Rules and the approval switch: ./legal.ts.
 *
 * Data-flow facts, each traced to code. FE = this repo; BE = the Express backend (saraya-mailer,
 * read at ae4a9c5). Re-check these citations whenever either side changes.
 *  F1 Contact form fields: name, email, phone, company, service, message + hidden honeypot
 *     (FE src/lib/contact-submit.ts:9, src/pages/Contact.tsx form; BE src/validation.js:101).
 *  F2 Audit form fields: name, company, email, website, phone?, source?, message? + honeypot
 *     (FE src/lib/contact-submit.ts:65, src/pages/FreeAudit.tsx form).
 *  F3 Both forms POST to our backend /api/contact (FE src/lib/contact-submit.ts:100), which emails
 *     the details to the staff inbox over SMTP (BE index.js:24-34, :177) and sends ONE auto-reply
 *     to the visitor's address at most every 24 h (BE index.js:45, :185-194). No database.
 *  F4 Duplicate suppression keeps a SHA-256 hash of email + lead type + website + message for
 *     10 min (BE index.js:44, :167-173); the auto-reply cap keeps a hash of the email for 24 h
 *     (BE index.js:185-187). Process memory only, lost on restart (BE src/abuse.js:3-6, :12-15).
 *  F5 Rate limits are express-rate-limit's in-memory store keyed by the client IP (no custom key,
 *     BE index.js:52-62): contact 5 per 15 min, chat 20 per minute and 200 per 24 h (BE index.js:37-42).
 *  F6 Turnstile is verified only when TURNSTILE_SECRET_KEY is set (BE index.js:149-160); the
 *     frontend renders no widget and sends no token, so the forms use no CAPTCHA today.
 *  F7 Chat: the browser sends the message plus at most the last 10 turns (FE
 *     src/services/openai.service.ts:27, :92) to our backend /api/chat, which forwards them with
 *     its system prompt to OpenAI (BE index.js:219-225, src/chat/openai.js:7, :20-27). The browser
 *     never calls OpenAI. History lives in page memory only (FE openai.service.ts:37); nothing is
 *     written to cookies or web storage (no localStorage/sessionStorage/document.cookie in live code).
 *  F8 Chat bodies are never logged: the server logs request id, model, token counts and timing
 *     (BE index.js:208, :226-232); the browser logs only a failure class (FE chatbot.service.ts:408).
 *  F9 Access log lines: request id, method, route pattern, status, ms. No IP, name, email, message
 *     or header value (BE src/http.js:3-5, :76-90).
 *  F10 No analytics: GA4 id is null (FE src/config/business.ts:67, C17). Fonts are self-hosted
 *     (FE public/_headers:9, STS-048). HTTPS with HSTS (FE public/_headers:12).
 *  F11 Hosting: Cloudflare Pages (vantry.yml stack). The backend host and the SMTP provider are not
 *     in either repo, so they are placeholders.
 */
import { BUSINESS } from "@/config/business";
import { ownerTodo, PRIVACY_PATH, TERMS_PATH, type LegalDocument } from "./legal";

const contactLink = { text: "contact form", to: "/contact" };

export const PRIVACY_POLICY: LegalDocument = {
  path: PRIVACY_PATH,
  title: "Privacy Policy",
  intro: [
    `This policy explains what information the ${BUSINESS.name} website collects, why we collect it and who receives it. "We" and "us" mean ${BUSINESS.name} ${ownerTodo("C1", "legal business name and entity type")}. It covers this website only: the contact form, the free audit request form and the Amina chat assistant.`,
  ],
  sections: [
    {
      id: "information-you-give-us",
      heading: "Information you give us",
      blocks: [
        { p: ["We only collect what you choose to send us:"] },
        {
          ul: [
            // F1
            ["Contact form: your name, email address and message, and, if you add them, your phone number and company name. You also pick the service you are interested in."],
            // F2
            ["Free audit request form: your name, business name, email address and website address, and, if you add them, your phone number, how you heard about us and a message."],
            // F7
            ["Chat assistant: the messages you type to Amina."],
          ],
        },
        {
          p: ["Please don't send sensitive information such as payment card numbers, passwords, health information or government ID numbers through the forms or the chat."],
        },
      ],
    },
    {
      id: "forms",
      heading: "How the forms work",
      blocks: [
        {
          ul: [
            // F3
            [`When you submit a form, our server emails your details to our team's inbox through our email provider ${ownerTodo("C23", "email (SMTP) provider name")}. It also sends one automatic confirmation email to the address you entered, at most once every 24 hours for the same address.`],
            // F3
            [`We don't keep form submissions in a database. Your details stay in our team's email inbox. ${ownerTodo("C23", "how long form emails are kept")}`],
            // F4
            ["To stop duplicate submissions and repeated confirmation emails, our server briefly keeps a one-way scrambled code (a hash) made from your email address and message: for up to 10 minutes to spot a duplicate, and for up to 24 hours to limit confirmation emails. It is kept in the server's memory only and is erased when the server restarts."],
            ["Each form contains a hidden field that people never see. It helps us block automated spam."],
            // F6
            ["The forms don't use a CAPTCHA today."],
            [`We use the details you send to answer your inquiry or to prepare your audit. ${ownerTodo("C23", "whether form details are ever used for marketing emails, and how to opt out")}`],
          ],
        },
      ],
    },
    {
      id: "chat",
      heading: "How the chat assistant works",
      blocks: [
        {
          ul: [
            // F7
            ["Amina is an AI assistant. When you send a message, your browser sends it, together with up to the last 10 messages of the current conversation, to our server. Our server forwards them to OpenAI, which generates the reply. Your browser does not connect to OpenAI directly."],
            // F7
            ["The conversation is kept only in your browser's memory while the page is open. It is not saved in cookies or browser storage, and it is gone when you reload or close the page."],
            // F8
            ["Our server does not save chat messages and does not write them to its logs. It records only technical details, such as the time, the result of the request and how much text the reply used."],
            [`OpenAI processes the messages to produce the reply, under its own terms. ${ownerTodo("C23", "the OpenAI data-retention terms that apply to our account")}`],
            [
              "AI answers can be wrong or incomplete. Please confirm anything important with our team. See our ",
              { text: "Terms of Use", to: TERMS_PATH },
              ".",
            ],
          ],
        },
      ],
    },
    {
      id: "technical-information",
      heading: "Technical information",
      blocks: [
        {
          ul: [
            // F5
            ["To prevent abuse, our server counts requests from each IP address in its memory: over 15 minutes for the forms, and over one minute and 24 hours for the chat. These counters are not written to disk and are erased when their time window ends or the server restarts."],
            // F9
            ["Our server's logs record a random request number, the page of our server that was called, the result and how long it took. They do not include your name, email address, messages or IP address."],
            [`The companies that host our website and our server may keep standard technical logs, such as IP address, browser type and time of request, under their own policies. ${ownerTodo("C23", "backend hosting provider and how long its logs are kept")}`],
          ],
        },
      ],
    },
    {
      id: "cookies",
      heading: "Cookies, analytics and tracking",
      blocks: [
        {
          ul: [
            // F7
            ["Our website's code does not set cookies and does not save anything in your browser's storage."],
            // F10
            [`We don't use Google Analytics or any other analytics, advertising or tracking service today. If we add one, we will update this policy first. ${ownerTodo("C17", "analytics choice, if any")}`],
            // F10
            ["The site's fonts are served from our own website, not from Google Fonts or another font service."],
            [`Cloudflare, which hosts the website, may set a strictly necessary security cookie to protect the site from attacks. ${ownerTodo("C23", "which Cloudflare security features are turned on for the site")}`],
          ],
        },
      ],
    },
    {
      id: "who-receives",
      heading: "Who receives your information",
      blocks: [
        {
          p: ["The website sends your information only to these service providers, which handle it for us to run the site:"],
        },
        {
          ul: [
            // F11
            ["Cloudflare (Cloudflare Pages) hosts and delivers the website."],
            [`Our server hosting provider runs the server that handles the forms and the chat. ${ownerTodo("C23", "server hosting provider name")}`],
            // F3
            [`Our email provider delivers form emails to our team and the confirmation email to you. ${ownerTodo("C23", "email (SMTP) provider name")}`],
            // F7
            ["OpenAI receives chat messages to generate the assistant's replies."],
          ],
        },
        {
          p: [`We may also disclose information when the law requires it. ${ownerTodo("C23", "statement on selling or sharing personal information")}`],
        },
      ],
    },
    {
      id: "security",
      heading: "How we protect it",
      blocks: [
        {
          p: [
            // F10, BE index.js:107-119 (CORS + origin check), src/validation.js (field checks)
            "The website is served over HTTPS. Our server refuses form and chat requests made from other websites' pages, checks every field it receives and limits how often it can be used. No way of sending or storing information is completely secure, so we cannot promise absolute security.",
          ],
        },
      ],
    },
    {
      id: "your-choices",
      heading: "Your choices",
      blocks: [
        {
          p: [
            "Using the forms and the chat is optional. You can ask us what information you have sent us, ask us to correct it, or ask us to delete it from our inbox, through our ",
            contactLink,
            `. ${ownerTodo("C23", "how and how quickly these requests are handled")}`,
          ],
        },
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        {
          p: ["This website is meant for businesses and adults. It is not directed to children under 13, and we don't knowingly collect their information."],
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [{ p: ["If we change this policy, we will post the new version on this page with a new effective date."] }],
    },
    {
      id: "contact",
      heading: "Contact us",
      blocks: [
        {
          p: [
            "Questions about this policy? Send them through our ",
            contactLink,
            `. ${ownerTodo("C3", "privacy contact email")} ${ownerTodo("C4", "mailing address for privacy requests")}`,
          ],
        },
      ],
    },
  ],
};
