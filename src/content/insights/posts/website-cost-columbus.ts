// STS-055 blog post: website-cost-columbus (REQ-118). DRAFT - OWNER REVIEW. Source: docs/website-remediation/content-drafts/blog/01-website-cost-columbus.md
//
// To publish: (1) fill or delete every [Owner to confirm ...] marker below, (2) set `date`,
// (3) change APPROVED to true. Nothing else. Until then the post is not routed, prerendered, linked
// or listed in the sitemap, and (because POST is null) its text is not even in the client bundle.
// See docs/ops/owner-content.md.
import type { BlogPost } from "../blog";

/** Owner approval, in writing (draft README "Publish steps" 3). */
const APPROVED = false;

export const POST_SOURCE: BlogPost = {
  "slug": "website-cost-columbus",
  "title": "How Much Does a Website Cost in Columbus, Ohio?",
  "metaTitle": "Website Cost in Columbus, Ohio: What Sets the Price",
  "description": "Pages, copywriting, photos, booking and upkeep: what drives a small business website quote in Columbus, and how to compare two quotes line by line.",
  "date": "",
  "author": {
    "name": "SarayaTech Solutions"
  },
  "topic": "how much does a website cost in Columbus, Ohio",
  "intro": [
    {
      "kind": "p",
      "text": "The honest answer is a range, and a range only means something once you know what moves it. This guide names the things that set the price of a small business website, shows what our own packages cost, and gives you a checklist so that two quotes on your desk describe the same job."
    }
  ],
  "sections": [
    {
      "heading": "Why two quotes for \"a website\" can be far apart",
      "blocks": [
        {
          "kind": "p",
          "text": "Two Columbus businesses can ask for \"a website\" and mean very different jobs. A plumber who needs five pages and a tap-to-call button is buying something different from a restaurant that wants online ordering, or a salon that wants clients to book a chair at 9 p.m. without calling."
        },
        {
          "kind": "p",
          "text": "We don't know of a reliable public survey of website prices in Columbus, so be careful with any article that hands you a single \"average\" figure. A more useful approach is to understand the parts, then ask every designer to price the same parts."
        }
      ]
    },
    {
      "heading": "The seven things that set the price",
      "blocks": [
        {
          "kind": "h3",
          "text": "1. How many pages, and how different they are"
        },
        {
          "kind": "p",
          "text": "Five pages that share one layout take less work than five pages that each need their own design. A separate page for each service you offer is common, because each one can then show up for its own search."
        },
        {
          "kind": "h3",
          "text": "2. Who writes the words"
        },
        {
          "kind": "p",
          "text": "Writing the copy is often the slowest part of a project. If you supply the text, the price usually drops. If the designer interviews you and writes it, that time belongs on the quote. Ask which one you are getting."
        },
        {
          "kind": "h3",
          "text": "3. Photos"
        },
        {
          "kind": "p",
          "text": "Real photos of your team, your work and your storefront tell customers more than stock images do, but someone has to take them. Plan for a photographer, or for your own phone photos taken in good daylight."
        },
        {
          "kind": "h3",
          "text": "4. What the site has to do"
        },
        {
          "kind": "p",
          "text": "A site that explains your business costs less than one that books appointments, takes payments, sells products or sends form entries into another tool. Every connection needs setup and testing. Payment processors also charge their own transaction fees, separate from anything you pay for the website."
        },
        {
          "kind": "h3",
          "text": "5. Being found on Google"
        },
        {
          "kind": "p",
          "text": "Basic setup, such as page titles, descriptions, a sitemap and fast-loading pages, should be part of any build. Ongoing work on your Google Business Profile, reviews and local search is a separate, monthly job. Know which one a quote includes."
        },
        {
          "kind": "h3",
          "text": "6. Mobile and accessibility"
        },
        {
          "kind": "p",
          "text": "Many customers will see your site on a phone first, so it has to work there before it works on a laptop. Building to the W3C's accessibility guidelines (WCAG 2.1) [Owner to confirm link], with readable contrast, labelled buttons and a site that works with a keyboard, takes care and testing time."
        },
        {
          "kind": "h3",
          "text": "7. What it costs after launch"
        },
        {
          "kind": "p",
          "text": "A website has running costs: the domain name (a yearly fee), hosting, security updates, backups and the small edits you will want over time. Ask who registers the domain. It should be in your name, so the address stays yours if you ever change designers."
        }
      ]
    },
    {
      "heading": "DIY builder, freelancer or agency?",
      "blocks": [
        {
          "kind": "p",
          "text": "Each route can be the right one."
        },
        {
          "kind": "ul",
          "items": [
            "**A do-it-yourself website builder** costs a monthly subscription plus your own hours. It can work well for a simple site if you have the time and enjoy the work.",
            "**A freelancer** can be good value for a defined project. Ask who maintains the site after launch and what happens if they become unavailable.",
            "**An agency** usually brings design, writing, your Google profile and ongoing marketing under one roof, and prices reflect the extra hands."
          ]
        },
        {
          "kind": "p",
          "text": "Whichever you choose, the checklist below applies."
        }
      ]
    },
    {
      "heading": "What SarayaTech charges",
      "blocks": [
        {
          "kind": "p",
          "text": "These are our packages for a [small business website in Columbus](/services/website-design) and beyond. Every package is quoted for your business, in writing, before any work starts."
        },
        {
          "kind": "table",
          "header": [
            "Package",
            "Who it's for",
            "What's included",
            "Price"
          ],
          "rows": [
            [
              "Local Starter",
              "New or very small businesses",
              "5-page website, Google Business Profile setup, review system",
              "[Owner to confirm: one-time price or range, C8]"
            ],
            [
              "Local Growth",
              "Businesses ready to grow",
              "Website, local SEO, 2 social platforms, monthly report",
              "[Owner to confirm: monthly price or range, C8]"
            ],
            [
              "Full Growth",
              "Established small businesses",
              "Everything in Local Growth, more social platforms, Google and Meta ads management, quarterly strategy call",
              "[Owner to confirm: monthly price or range, C8], plus ad spend billed separately"
            ],
            [
              "Custom app or software",
              "Any business with a process to automate",
              "Scoping, design, build, support",
              "[Owner to confirm: \"quote from\" starting value, C8]"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "The monthly packages include ongoing [Google Business Profile and local SEO](/services/local-seo) work, which is why they are priced by the month rather than once. If you need booking, a customer portal or something no off-the-shelf tool does, that is [a custom app](/services/app-development) and is scoped separately. The full details are on [Packages & Pricing](/pricing)."
        },
        {
          "kind": "p",
          "text": "[Owner to confirm: optional, one sentence on what most often changes a quote for your clients, in your own words. Delete if not wanted.]"
        }
      ]
    },
    {
      "heading": "How to compare quotes line by line",
      "blocks": [
        {
          "kind": "p",
          "text": "Put each quote next to these questions and write the answer in a column. Gaps show up quickly."
        },
        {
          "kind": "ol",
          "items": [
            "How many pages are included, and is the copywriting included?",
            "Who registers and owns the domain, and can I get a copy of my site files?",
            "What does hosting cost after the first year, and who pays it?",
            "Are booking, payments or forms included, and which tools do they use?",
            "Is my Google Business Profile set up, or only the website?",
            "How are edits after launch handled: included hours, or billed separately?",
            "Is the price fixed in writing, and what would change it?"
          ]
        },
        {
          "kind": "p",
          "text": "A low quote that leaves out copywriting, photos or hosting may not be the cheaper one once those are added back. A high quote should be able to tell you exactly what the extra pays for."
        }
      ]
    },
    {
      "heading": "Already have a site?",
      "blocks": [
        {
          "kind": "p",
          "text": "If you already have a website and aren't sure whether to fix it or replace it, [request a free website and Google profile audit](/free-audit). We'll look at what you have and tell you what we would change, whether you hire us or not."
        }
      ]
    }
  ],
  "approved": APPROVED,
  "ownerReview": [
    "Do not publish until every [OWNER: ...] price is filled with a real C8 figure or range (REQ-118 acceptance: 'uses real C8 prices or ranges only'). If the owner decides not to publish numbers, this article cannot ship as written.",
    "Owner input: C8: package prices or ranges (Local Starter one-time, Local Growth monthly, Full Growth monthly, Custom App 'quote from')",
    "Owner input: C9: confirm local SEO and social are sold today (they appear in the package table)",
    "Owner input: C16: confirm the free-audit wording ('whether you hire us or not' is the source's line)",
    "Set the publication date (YYYY-MM-DD) when approving; the draft has none.",
    "Replace each [Owner to confirm ...] marker; the build refuses an approved post that still has one."
  ]
};

/** The only export the app reads. null while unapproved, so a draft is dropped from the bundle. */
export const POST: BlogPost | null = APPROVED ? POST_SOURCE : null;
