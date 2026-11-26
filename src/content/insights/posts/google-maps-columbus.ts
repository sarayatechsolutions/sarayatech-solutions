// STS-055 blog post: google-maps-columbus (REQ-119). DRAFT - OWNER REVIEW. Source: docs/website-remediation/content-drafts/blog/02-google-maps-columbus.md
//
// To publish: (1) fill or delete every [Owner to confirm ...] marker below, (2) set `date`,
// (3) change APPROVED to true. Nothing else. Until then the post is not routed, prerendered, linked
// or listed in the sitemap, and (because POST is null) its text is not even in the client bundle.
// See docs/ops/owner-content.md.
import type { BlogPost } from "../blog";

/** Owner approval, in writing (draft README "Publish steps" 3). */
const APPROVED = false;

export const POST_SOURCE: BlogPost = {
  "slug": "google-maps-columbus",
  "title": "How to Show Up on Google Maps in Columbus",
  "metaTitle": "Show Up on Google Maps in Columbus: A Plain Guide",
  "description": "Claim and verify your Google Business Profile, get the basics right and ask for reviews the right way. What Google says decides the map results.",
  "date": "",
  "author": {
    "name": "SarayaTech Solutions"
  },
  "topic": "how to show up on Google Maps in Columbus",
  "intro": [
    {
      "kind": "p",
      "text": "When someone in Clintonville types \"plumber near me\" or \"hair salon open now\", the short list of businesses next to the map does not come from websites. It comes from Google Business Profiles. If you don't have one, or it is half filled in, you are very hard to find on that list, however good your work is."
    },
    {
      "kind": "p",
      "text": "This guide covers what Google says decides that list, and the steps that are within your control."
    }
  ],
  "sections": [
    {
      "heading": "What decides who shows up",
      "blocks": [
        {
          "kind": "p",
          "text": "Google states that local results are based mainly on three things: **relevance**, **distance** and **prominence** (source: Google Business Profile Help, \"Tips to improve your local ranking on Google\" [Owner to confirm link])."
        },
        {
          "kind": "ul",
          "items": [
            "**Relevance** is how well your profile matches what the person searched. A complete profile with the right category and a clear list of services gives Google more to match.",
            "**Distance** is how far you are from the person searching, or from the place they named. You can't change this. The same search made in German Village and in Clintonville can return different businesses.",
            "**Prominence** is how well known your business is. Google says this draws on information from across the web, including links, articles and directories, and that your review count and rating play a part."
          ]
        },
        {
          "kind": "p",
          "text": "The same Google page says there is no way to request or pay for a better local ranking. Treat anyone who promises you a guaranteed spot on the map with caution."
        }
      ]
    },
    {
      "heading": "Step 1: Claim and verify your profile",
      "blocks": [
        {
          "kind": "p",
          "text": "Creating a Google Business Profile is free. Sign in with a Google account that **you** own, because the account that owns the profile controls it. If someone helps you, such as an employee, a family member or an agency, add them as a manager from inside the profile. Never hand over your password."
        },
        {
          "kind": "p",
          "text": "Google then asks you to verify that the business is yours. Google decides which methods it offers you; depending on the business, these can include a phone call or text, an email, a recorded video or a postcard by mail (source: Google Business Profile Help, verification [Owner to confirm link]). Verification can take a few days, so start early."
        }
      ]
    },
    {
      "heading": "Step 2: Get the basics exactly right",
      "blocks": [
        {
          "kind": "ul",
          "items": [
            "**Business name.** Use your real-world name, exactly as it appears on your sign, your invoices and your website. Adding words like \"Best Roofer Columbus\" to the name goes against Google's guidelines and can get a profile suspended (source: \"Guidelines for representing your business on Google\" [Owner to confirm link]).",
            "**Address or service area.** If customers come to you, show your address. If you go to them, as most contractors, cleaners and mobile groomers do, set a service area and hide your street address. Google's guidelines don't allow a mailbox or an unstaffed virtual office as your business location.",
            "**Category.** Your primary category should describe what your business *is*, not everything it sells. Choose the most specific one that fits. Add secondary categories only for real services you offer.",
            "**Phone, website and hours.** Include holiday hours. Wrong hours cost you the customer who drove over and found the door locked."
          ]
        }
      ]
    },
    {
      "heading": "Step 3: Make the profile worth clicking",
      "blocks": [
        {
          "kind": "p",
          "text": "Once the basics are right, the rest of the profile helps a customer choose you."
        },
        {
          "kind": "ul",
          "items": [
            "**Photos.** Add real ones: the outside of your building so people recognize it, the inside, your team and your finished work. Get permission before showing a customer's home or face.",
            "**Services or menu.** List what you do, in the words your customers use.",
            "**Description.** Two or three plain sentences about who you serve and what you do.",
            "**Posts.** Share an update, an offer or a finished project regularly. A profile that shows recent activity tells a visitor you are open and busy."
          ]
        }
      ]
    },
    {
      "heading": "Step 4: Keep your name, address and phone identical everywhere",
      "blocks": [
        {
          "kind": "p",
          "text": "Your business probably appears in more places than Google: Bing Places, Apple Business Connect (which feeds Apple Maps), Yelp, Facebook, the Better Business Bureau and local directories [Owner to confirm link]. Use the same name, address and phone number on all of them, spelled the same way. If one says \"Suite 200\" and another says \"Ste. 200\", pick one and fix the other. Conflicting details confuse customers and give search engines a less consistent picture of your business."
        }
      ]
    },
    {
      "heading": "Step 5: Ask every customer for a review, the same way",
      "blocks": [
        {
          "kind": "p",
          "text": "Reviews help customers decide, and they are part of prominence. Your profile includes a share link for asking for reviews. Send it to **every** customer when a job is done, with the same neutral words, for example: \"Thanks for choosing us. If you have a minute, we'd value an honest review: [link].\""
        },
        {
          "kind": "p",
          "text": "Two things to avoid:"
        },
        {
          "kind": "ul",
          "items": [
            "**Don't ask only the customers you think are happy.** Google's policy for reviews prohibits selectively soliciting positive reviews (source: Google Maps user-contributed content policy [Owner to confirm link]).",
            "**Don't offer anything in return** for a review: no discount, no free month, no entry into a draw. Google's policy prohibits incentives, and the FTC's 2024 rule on consumer reviews (16 CFR Part 465) [Owner to confirm link] addresses fake reviews and the suppression of negative ones."
          ]
        },
        {
          "kind": "p",
          "text": "Reply to every review, good and bad, politely and without sharing details about the customer. Future customers read the replies too."
        }
      ]
    },
    {
      "heading": "Step 6: Connect your website",
      "blocks": [
        {
          "kind": "p",
          "text": "Your profile and [your website](/services/website-design) should back each other up. The website should show the same name, address or service area, and phone number as the profile. Give each main service its own page, and mention the parts of Columbus you actually serve where it is true. When the profile links to the site and the site confirms the profile, both are easier to trust."
        }
      ]
    },
    {
      "heading": "What not to do",
      "blocks": [
        {
          "kind": "ul",
          "items": [
            "Buy reviews, or post reviews from staff, family or yourself.",
            "Create a second profile for the same location.",
            "Use a home address you don't want public: switch to a service area instead.",
            "Pay anyone who guarantees a number one position on Google Maps."
          ]
        },
        {
          "kind": "p",
          "text": "If you'd rather have someone handle this for you, that is what our [local SEO in Columbus](/services/local-seo) service covers."
        }
      ]
    },
    {
      "heading": "See how your profile looks to a customer",
      "blocks": [
        {
          "kind": "p",
          "text": "Not sure what a customer sees when they find you? [Request a free audit](/free-audit) and we'll review your website and Google profile and tell you what we would fix first."
        }
      ]
    }
  ],
  "approved": APPROVED,
  "ownerReview": [
    "Owner approves the draft (MO-46). Owner checks every [VERIFY LINK] against Google's and the FTC's current pages on the day of publishing: platform rules change.",
    "Owner input: C9: confirm local SEO is sold today (the article links to /services/local-seo)",
    "Owner input: C16: confirm the free-audit wording",
    "Set the publication date (YYYY-MM-DD) when approving; the draft has none.",
    "Replace each [Owner to confirm ...] marker; the build refuses an approved post that still has one."
  ]
};

/** The only export the app reads. null while unapproved, so a draft is dropped from the bundle. */
export const POST: BlogPost | null = APPROVED ? POST_SOURCE : null;
