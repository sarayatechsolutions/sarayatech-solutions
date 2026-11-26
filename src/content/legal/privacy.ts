/**
 * Privacy Policy DRAFT copy (STS-037, REQ-046). Rules and the approval switch: ./legal.ts.
 *
 * Data-flow facts, each traced to code. FE = this repo; BE = the Next.js backend
 * (sarayatech-solutions-backend, read 2026-11-25 after the Express service was retired; the old
 * index.js / src/*.js files are deleted). Citations name a file and a symbol rather than a line,
 * so they survive small edits. Re-check them whenever either side changes.
 *  F1 Contact form fields: name, email, phone, company, service, message, source? + hidden honeypot
 *     (FE src/lib/contact-submit.ts ContactPayload, src/pages/Contact.tsx form; BE lib/validation.ts
 *     validateContact). `source` is one of five fixed values (FE src/content/forms/lead-source.ts,
 *     BE lib/validation.ts SOURCE_OPTIONS), sent only when chosen (STS-054).
 *  F2 Audit form fields: name, company, email, website, phone?, source?, message? + honeypot
 *     (FE src/lib/contact-submit.ts AuditPayload, src/pages/FreeAudit.tsx form).
 *  F3 Both forms POST to our backend /api/contact (FE src/lib/contact-submit.ts postLead). The
 *     backend first stores the lead (F13), then emails the details to the staff inbox over SMTP
 *     through a mail outbox that retries a failed send with backoff (ADR 0003 decision 2; BE
 *     lib/services/contact.ts, lib/mail/), and sends ONE auto-reply to the visitor's address at most
 *     every 24 h (BE lib/services/contact.ts AUTO_REPLY_WINDOW_MS, recentAutoReplies).
 *  F4 Duplicate suppression keeps a SHA-256 hash of email + lead type + website + message for
 *     10 min (BE lib/services/contact.ts DUPLICATE_WINDOW_MS, submissionKey); the auto-reply cap
 *     keeps a hash of the email for 24 h. Both live in BE lib/abuse.ts TtlSet: process memory only,
 *     lost on restart, no timer. An expired entry is no longer used and is deleted at the next
 *     claim on that set (a later submission reaching that check), not at the instant it expires.
 *  F5 Rate limits are BE lib/rate-limit.ts MemoryRateLimitStore, keyed by the client IP
 *     (BE lib/app.ts limit(), lib/http/client-ip.ts): contact 5 per 15 min, chat 20 per minute and
 *     200 per 24 h (RATE_LIMITS). In memory, no timer: an ended window stops counting, and ended
 *     windows are swept on a later contact or chat request, at most once every 60 s
 *     (RATE_LIMIT_SWEEP_INTERVAL_MS).
 *  F6 Turnstile is verified only when TURNSTILE_SECRET_KEY is set (BE lib/services/contact.ts,
 *     config.turnstileSecret); the frontend renders no widget and sends no token, so the forms use
 *     no CAPTCHA today.
 *  F7 Chat: the browser sends the message plus at most the last 10 turns (FE
 *     src/services/openai.service.ts CHAT_LIMITS.historyItems) to our backend /api/chat, which
 *     forwards them with its system prompt to OpenAI (BE lib/services/chat.ts, lib/chat/openai.ts,
 *     lib/chat/system-prompt.ts). The browser never calls OpenAI. History lives in page memory only
 *     (FE openai.service.ts conversationHistory); nothing is written to cookies or web storage (no
 *     localStorage/sessionStorage/document.cookie in live code, except the analytics consent key of F12,
 *     which is written only when a GA4 id is set).
 *  F8 Chat bodies are never logged: the server logs request id, model, token counts and timing
 *     (BE lib/services/chat.ts chat_completed / chat_upstream_failed); the browser logs only a
 *     failure class (FE src/services/chatbot.service.ts, "AI backend unavailable").
 *  F9 Access log lines: request id, method, route pattern, status, ms. No IP, name, email, message
 *     or header value (BE lib/app.ts logger.info("request"), logging rule in lib/log.ts).
 *  F10 No analytics while the GA4 id is unset (FE src/config/analytics.ts GA4_ID, from
 *     src/config/business.ts ga4Id or VITE_GA4_ID, C17): src/lib/analytics.ts then loads nothing and
 *     writes nothing. Fonts are self-hosted
 *     (FE public/_headers, STS-048). HTTPS with HSTS (FE public/_headers Strict-Transport-Security).
 *  F12 Analytics ON (only when a valid GA4 id is set, STS-050): src/lib/analytics.ts stores the
 *     choice in localStorage key CONSENT_STORAGE_KEY ("granted" / "denied"); Google Analytics loads
 *     only after "granted" and then sets its own cookies; Google signals and ad personalization are
 *     off (allow_google_signals / allow_ad_personalization_signals false), ad consent stays denied;
 *     events carry only fixed values (EVENT_SCHEMA): page path, form type, lead-source choice, which
 *     button, contact method. The text switches automatically with `analyticsOn` below.
 *  F11 Hosting: Cloudflare Pages (vantry.yml stack). The backend host and the SMTP provider are not
 *     in either repo, so they are placeholders.
 *  F13 Lead store (STS-079..084; docs/decisions/0003-backend-lead-store-and-admin.md in the
 *     programme folder). Checked against the BE tree (wt-be-next) on 2026-11-26:
 *     - Saved before mail: BE lib/services/contact.ts createContactService stores the lead, then
 *       sends; a failed send is queued in mail_outbox and retried (BE lib/mail/outbox.ts). If the
 *       store itself is down, the lead is mailed directly and NOT saved, with no reference, hence
 *       "normally saves" below. Drivers: BE lib/db/sqlite.ts (node:sqlite, Node host) and
 *       lib/db/d1.ts (Cloudflare D1, Workers) behind lib/db/sql.ts SqlLeadRepository.
 *     - Retention: BE lib/jobs/maintenance.ts runMaintenance calls SqlLeadRepository.purgeOlderThan
 *       with LEAD_RETENTION_DAYS (default 365; the visible period is an owner placeholder until C23
 *       is approved). It runs from BE lib/server.ts startMaintenance (Node, off when
 *       MAINTENANCE_INTERVAL_SECONDS=0) or worker.ts scheduled() (Workers cron in wrangler.jsonc).
 *       Deleting a lead also deletes its lead_events and mail_outbox rows (ON DELETE CASCADE in BE
 *       lib/db/migrations.ts). CSV exports are copies outside the database (FE
 *       docs/ops/owner-content.md §4).
 *     - Access: only the admin API /api/v1/admin/* (BE lib/admin/auth.ts createAdminAuthorizer,
 *       bearer ADMIN_API_TOKEN; lib/admin/http.ts, never CORS-exposed) and the server-rendered
 *       /admin console (BE lib/admin/session.ts createSessionCodec, HMAC-signed HttpOnly cookie;
 *       lib/admin/console/http.ts). Both answer 404 when off: BE lib/app.ts route() serves the
 *       404 catch-all for admin routes while ADMIN_API_TOKEN is unset, and for console routes
 *       unless ADMIN_SESSION_SECRET is also set (consoleEnabled). Every admin read that returns
 *       personal data is audited before it is returned: lead.view (one lead, and a status update
 *       that changes nothing), lead.list / lead.search (the list; the search term is not stored) and
 *       lead.export (CSV) (STS-085; BE lib/admin/service.ts). Stats, the audit trail and the outbox
 *       list carry no personal data and are not audited.
 *     - Erasure: SqlLeadRepository.eraseLead (one lead, from the console or the API) and
 *       eraseByEmail (every lead for one email, API only: POST /api/v1/admin/erasure). On SQLite,
 *       secure_delete is on, and a best-effort WAL checkpoint runs after an erasure; if a reader
 *       holds the WAL it completes on a later erasure or purge and db_checkpoint_incomplete is
 *       logged (BE lib/db/sqlite.ts);
 *       backups taken earlier, D1 Time Travel and CSV exports still hold copies (BE docs/DEPLOY.md
 *       "Erasure and backups"). Re-check this note against the committed BE tree (commit SHA in
 *       place of the worktree name above) before LEGAL_PAGES_APPROVED (A11-3).
 *     - Chats are NOT stored (ADR 0003, out of scope; F8). A stored lead's 200 carries `reference`,
 *       shown to the visitor only after FE src/lib/contact-submit.ts leadReference checks
 *       LEAD_REFERENCE_PATTERN (src/components/LeadReferenceNote.tsx), and never sent to analytics
 *       (F12).
 */
import { BUSINESS } from "@/config/business";
import { analyticsConfigured } from "@/config/analytics";
import { ownerTodo, PRIVACY_PATH, TERMS_PATH, type Inline, type LegalDocument } from "./legal";

const contactLink = { text: "contact form", to: "/contact" };

/**
 * F7 / F10 / F12. While no GA4 id is set (today) these are the original sentences, word for word,
 * and they are literally true. Setting an id switches them, at build time, to the analytics wording.
 * // OWNER REVIEW (C17): the analytics wording must be approved before an id is set.
 */
const cookieBullets = (analyticsOn: boolean): Inline[][] =>
  analyticsOn
    ? [
        // F12
        ["Our website's code does not set cookies of its own. It saves one setting in your browser's storage: whether you accepted or declined analytics, so we don't ask again on every page."],
        // F12
        [`If you accept, we use Google Analytics to count visits and see which pages and buttons are used. Google Analytics then sets its own cookies in your browser. We turn off Google signals and ad personalization, and we never send it your name, email address, phone number or messages. If you decline, Google Analytics is not loaded at all. To change your choice at any time, use the "Cookie settings" button at the bottom of every page. If you decline after accepting, we stop Google Analytics from storing anything and delete its cookies from your browser. ${ownerTodo("C17", "Google Analytics wording and how long Google keeps the data")}`],
      ]
    : [
        // F7
        ["Our website's code does not set cookies and does not save anything in your browser's storage."],
        // F10
        [`We don't use Google Analytics or any other analytics, advertising or tracking service today. If we add one, we will update this policy first. ${ownerTodo("C17", "analytics choice, if any")}`],
      ];

/** Built from the analytics switch; `PRIVACY_POLICY` below is what the site renders. */
export const privacyPolicy = (analyticsOn: boolean = analyticsConfigured()): LegalDocument => ({
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
            ["Contact form: your name, email address and message, and, if you add them, your phone number, company name and how you heard about us. You also pick the service you are interested in."],
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
            // F3, F13
            [`When you submit a form, our server normally saves your details in its database, then emails them to our team's inbox through our email provider ${ownerTodo("C23", "email (SMTP) provider name")}. If that email can't be sent right away, our server tries again later. It also sends one automatic confirmation email to the address you entered, at most once every 24 hours for the same address.`],
            // F13
            ["Once your details are saved, the page shows you a reference code for your request. You can mention it if you contact us about that request."],
            // F13
            [`We keep each form submission in our server's database for ${ownerTodo("C23", "365 days")}. After that, it is deleted automatically. The email copy in our team's inbox is kept for ${ownerTodo("C23", "how long form emails are kept")}`],
            // F13
            [`Only ${BUSINESS.name} staff can see stored form submissions, through a password-protected admin area of our server.`],
            // F4
            ["To stop duplicate submissions and repeated confirmation emails, our server keeps one-way scrambled codes (hashes): one made from your email address, the form you used, your website address and your message, used for up to 10 minutes to spot a duplicate, and one made from your email address, used for up to 24 hours to limit confirmation emails. When that time is up, a code is no longer used, and it is deleted the next time our server checks a new form submission against these codes. The codes are kept in the server's memory only, and a server restart also erases them."],
            ["Each form contains a hidden field that people never see. It helps us block automated spam."],
            // F6
            ["The forms don't use a CAPTCHA today."],
            // F13
            [`We use the details you send only to answer your inquiry or to prepare your audit. ${ownerTodo("C23", "that form details are never used for marketing emails")}`],
            // F13
            // F13 (A12-3): erasure does not reach backups taken earlier, the host's short-term database
            // history (D1 Time Travel, 7 to 30 days) or exported copies (BE docs/DEPLOY.md "Erasure and backups").
            // A13-1: the window must cover the LONGEST of the backup rotation (BE DEPLOY.md keeps backups
            // up to LEAD_RETENTION_DAYS), any kept `wrangler d1 export` copy, and D1 Time Travel. See
            // docs/ops/owner-content.md section 4. Do not publish a number shorter than that.
            [
              "You can ask us to delete your form submission at any time through our ",
              contactLink,
              `. We then erase it from our database and our inbox. Copies in our backups and in our hosting provider's short-term database history are removed when those expire, within ${ownerTodo("C23", "the longest time any backup or database history copy is kept")}.`,
            ],
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
            ["To prevent abuse, our server counts requests from each IP address in its memory: over 15 minutes for the forms, and over one minute and 24 hours for the chat. When a time window ends, its counter no longer counts toward a limit, and it is deleted during a later form or chat request (our server clears ended counters at most once a minute). These counters are not written to disk, and a server restart erases them."],
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
            ...cookieBullets(analyticsOn),
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
            // F13
            [`Our server hosting provider runs the server that handles the forms and the chat, and stores the database that holds form submissions. ${ownerTodo("C23", "server hosting provider name")}`],
            // F3
            [`Our email provider delivers form emails to our team and the confirmation email to you. ${ownerTodo("C23", "email (SMTP) provider name")}`],
            // F7
            ["OpenAI receives chat messages to generate the assistant's replies."],
            // F12: only when analytics is configured
            ...(analyticsOn ? [["Google (Google Analytics) receives the pages you visit and the buttons you use on our website, only if you accept analytics."]] : []),
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
            // F10; BE lib/app.ts (a POST with a foreign Origin gets 403) + lib/http/cors.ts (allow-list),
            // lib/validation.ts (field checks), lib/rate-limit.ts (F5)
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
            // F13: the admin API erases a stored lead
            "Using the forms and the chat is optional. You can ask us what information you have sent us, ask us to correct it, or ask us to delete it from our database and our inbox, through our ",
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
});

export const PRIVACY_POLICY: LegalDocument = privacyPolicy();
