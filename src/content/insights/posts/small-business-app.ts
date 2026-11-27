// STS-055 blog post: small-business-app (REQ-121). DRAFT - OWNER REVIEW. Source: docs/website-remediation/content-drafts/blog/04-small-business-app.md
//
// To publish: (1) fill or delete every [Owner to confirm ...] marker below, (2) set `date`,
// (3) change APPROVED to true. Nothing else. Until then the post is not routed, prerendered, linked
// or listed in the sitemap, and (because POST is null) its text is not even in the client bundle.
// See docs/ops/owner-content.md.
import type { BlogPost } from "../blog";

/** Owner approval, in writing (draft README "Publish steps" 3). */
const APPROVED = false;

export const POST_SOURCE: BlogPost = {
  "slug": "small-business-app",
  "title": "Do Small Businesses Need an App?",
  "metaTitle": "Does Your Small Business Need an App? How to Decide",
  "description": "Native app, web app or a better website? Five questions to ask before you pay for an app, and what makes one worth building for a small business.",
  "date": "",
  "author": {
    "name": "SarayaTech Solutions"
  },
  "topic": "do small businesses need an app",
  "intro": [
    {
      "kind": "p",
      "text": "Most small businesses don't need an app in the App Store. Many do need something app-like: a way for customers to book, pay or check a status without calling you. Those are not the same purchase, and mixing them up is how a business ends up paying for an app nobody downloads."
    },
    {
      "kind": "p",
      "text": "This guide explains the difference and gives you five questions to answer before you spend anything."
    }
  ],
  "sections": [
    {
      "heading": "Three things people mean by \"an app\"",
      "blocks": [
        {
          "kind": "ul",
          "items": [
            "**A native app** is downloaded from Apple's App Store or Google Play and lives on the home screen. It can use the phone's camera, location, notifications and storage most fully.",
            "**A web app** runs in the browser, with nothing to download. Online booking, a customer portal where clients upload documents, or an internal tool your team uses on a tablet are usually web apps.",
            "**A progressive web app (PWA)** is a web app that can be added to the home screen and opened like an app, without going through an app store."
          ]
        },
        {
          "kind": "p",
          "text": "When an owner says \"we need an app\", the job underneath is usually one of a few things: take bookings, take payments, show a job's status, or replace a paper process. Each of those can be done more than one way."
        }
      ]
    },
    {
      "heading": "When a native app makes sense",
      "blocks": [
        {
          "kind": "p",
          "text": "A native app earns its place when at least one of these is true:"
        },
        {
          "kind": "ul",
          "items": [
            "**Customers use it often.** Weekly or more: reordering, a loyalty program, a membership, a class schedule. Someone who uses you twice a year won't keep your app on their phone.",
            "**It needs the phone itself.** Working offline, scanning, using the camera heavily, or tracking location in the background.",
            "**Your own team uses it in the field.** Inspection checklists, job photos, signatures on site. Staff will install an app their work depends on, even when customers won't."
          ]
        }
      ]
    },
    {
      "heading": "When a website or web app is the better first step",
      "blocks": [
        {
          "kind": "ul",
          "items": [
            "**Customers visit a few times a year.** They will search for you, not open an app.",
            "**The job is a form with a few steps.** Booking, requesting a quote, paying an invoice and uploading a file all work in the browser.",
            "**Budget and upkeep.** A native app for both iPhone and Android means publishing to two stores, passing each store's review, and updating the app as the phone systems change. Apple charges an annual developer membership (stated as US$99 a year) and Google Play a one-time registration fee (stated as US$25) (sources: Apple Developer Program; Google Play Console Help [Owner to confirm link]). Those fees are small next to the cost of building and maintaining two apps, but they show that a store app is an ongoing commitment, not a one-off."
          ]
        },
        {
          "kind": "p",
          "text": "Often the right first step is simply [a website that works on a phone](/services/website-design), with booking or payments built in."
        }
      ]
    },
    {
      "heading": "The middle option: a progressive web app",
      "blocks": [
        {
          "kind": "p",
          "text": "A PWA can sit on the home screen, open full screen and, on recent phones, send notifications. On iPhone, notifications from a web app work only after the user adds it to the home screen, on iOS 16.4 or later (source: WebKit / Apple [Owner to confirm link]). A PWA won't appear in app store searches, and it has less access to the phone than a native app. For many small businesses, it covers what they wanted from an app at a lower cost to build and maintain."
        }
      ]
    },
    {
      "heading": "Five questions to answer before you build anything",
      "blocks": [
        {
          "kind": "ol",
          "items": [
            "**What task, done by whom, how often?** \"Customers book a cleaning every two weeks\" is a clear task. \"We should have an app\" is not.",
            "**What does that task cost you today?** Count the phone calls, the hours of back-and-forth, the missed appointments. Use your own numbers.",
            "**Does an existing tool already do it?** Scheduling, invoicing and loyalty software exist for many industries. If one fits, a subscription may beat a custom build. Custom software makes sense when your process doesn't fit the off-the-shelf tools.",
            "**What is the smallest first version?** One user type, one main task, done well. Add the rest once real people use it.",
            "**Who will maintain it?** Phones, browsers and security requirements change every year. Budget for updates from the start."
          ]
        },
        {
          "kind": "p",
          "text": "If you can answer all five clearly, you are ready to talk to an [app developer in Columbus](/services/app-development) or anywhere else, and the quotes you get will describe the same job."
        }
      ]
    },
    {
      "heading": "What a custom app costs",
      "blocks": [
        {
          "kind": "p",
          "text": "Every app is different, so ours are quoted after a scoping conversation, in a written plan you see before any work starts. [Owner to confirm: \"Custom apps start from $X.\" with the real C8 starting value, or delete this sentence.] The main cost drivers are the number of screens, how many types of user it has (customers, staff, admin), payments, connections to other tools, native versus web, and ongoing support. See [Packages & Pricing](/pricing) for how our custom quotes work."
        }
      ]
    },
    {
      "heading": "Not sure an app is the answer?",
      "blocks": [
        {
          "kind": "p",
          "text": "Sometimes the real problem is that the website isn't doing its job. If you have a site, [request a free audit](/free-audit): we'll review your website and Google profile and tell you whether an app, a better website or neither is the next step."
        }
      ]
    }
  ],
  "approved": APPROVED,
  "ownerReview": [
    "Owner approves the draft (MO-46). Owner fills or deletes the one [OWNER: ...] price line (C8). Owner checks each [VERIFY LINK] against Apple's, Google's and the WebKit project's current pages on the day of publishing.",
    "Owner input: C8: the Custom App 'quote from' starting value, or delete that sentence",
    "Owner input: C9: confirm app development is sold today",
    "Owner input: C16: confirm the free-audit wording",
    "Set the publication date (YYYY-MM-DD) when approving; the draft has none.",
    "Replace each [Owner to confirm ...] marker; the build refuses an approved post that still has one."
  ]
};

/** The only export the app reads. null while unapproved, so a draft is dropped from the bundle. */
export const POST: BlogPost | null = APPROVED ? POST_SOURCE : null;
