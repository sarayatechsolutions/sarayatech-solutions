// STS-055 blog post: facebook-instagram-tiktok (REQ-122). DRAFT - OWNER REVIEW. Source: docs/website-remediation/content-drafts/blog/05-facebook-instagram-tiktok.md
//
// To publish: (1) fill or delete every [Owner to confirm ...] marker below, (2) set `date`,
// (3) change APPROVED to true. Nothing else. Until then the post is not routed, prerendered, linked
// or listed in the sitemap, and (because POST is null) its text is not even in the client bundle.
// See docs/ops/owner-content.md.
import type { BlogPost } from "../blog";

/** Owner approval, in writing (draft README "Publish steps" 3). */
const APPROVED = false;

export const POST_SOURCE: BlogPost = {
  "slug": "facebook-instagram-tiktok",
  "title": "Facebook vs Instagram vs TikTok: Which Should a Local Business Use?",
  "metaTitle": "Facebook vs Instagram vs TikTok for Local Businesses",
  "description": "Which social platform fits a local business? How Facebook, Instagram and TikTok differ, what each asks of you each week, and how to judge results.",
  "date": "",
  "author": {
    "name": "SarayaTech Solutions"
  },
  "topic": "Facebook vs Instagram vs TikTok for local businesses",
  "intro": [
    {
      "kind": "p",
      "text": "You don't need all three. A local business usually does better with one platform it posts on every week than with three it abandons by spring. The right one depends on two things: where your customers already spend time, and what you can realistically make each week."
    }
  ],
  "sections": [
    {
      "heading": "Start with two questions",
      "blocks": [
        {
          "kind": "p",
          "text": "**Where are your customers?** Don't guess. Ask new customers how they found you, and add a \"How did you hear about us?\" question to your contact form. For a wider view of who uses which platform, the Pew Research Center publishes regular surveys of social media use by US adults, broken down by age (source: Pew Research Center [Owner to confirm link]). Check the latest edition rather than trusting figures quoted in older articles."
        },
        {
          "kind": "p",
          "text": "**What can you make every week?** Be honest about time. Photos of finished work take minutes. A short video that holds attention takes longer, especially at first. Pick the platform that matches the content you can keep producing."
        }
      ]
    },
    {
      "heading": "Facebook: your neighborhood's notice board",
      "blocks": [
        {
          "kind": "p",
          "text": "Facebook is where many people look up a local business's hours, check recommendations and find events. Its strengths for a local business:"
        },
        {
          "kind": "ul",
          "items": [
            "**A business Page** that carries your hours, contact details, photos and reviews.",
            "**Local groups,** where neighbors ask \"Can anyone recommend a plumber?\" Answer helpfully as yourself, follow each group's rules, and don't post ads where they aren't allowed.",
            "**Events,** useful for restaurants, studios and shops running classes, tastings or sales.",
            "**Location-targeted [Meta ads](/services/paid-ads),** if you later decide to pay for reach."
          ]
        },
        {
          "kind": "p",
          "text": "The limit: don't expect every follower to see every post. Posts that start conversations travel further than announcements."
        },
        {
          "kind": "p",
          "text": "**Often a good fit for:** home services, restaurants with regulars, community-focused shops."
        }
      ]
    },
    {
      "heading": "Instagram: when your work looks good in pictures",
      "blocks": [
        {
          "kind": "p",
          "text": "Instagram is built around photos and short video. If what you do is visual, such as hair, food, interiors or finished renovations, your profile becomes a portfolio people scroll before they decide."
        },
        {
          "kind": "ul",
          "items": [
            "**The grid** shows your best work at a glance.",
            "**Reels** (short vertical videos) can reach people who don't follow you yet.",
            "**Stories** suit daily specials, openings and behind-the-scenes moments.",
            "**The link on your profile** should go straight to booking or ordering, not your home page."
          ]
        },
        {
          "kind": "p",
          "text": "Instagram and Facebook are both owned by Meta, and Meta Business Suite lets you publish to a Facebook Page and an Instagram account in one step (source: Meta Business Suite Help [Owner to confirm link]). That makes running both less work than it sounds."
        },
        {
          "kind": "p",
          "text": "**Often a good fit for:** salons, barbers, restaurants, bakeries, remodelers, photographers."
        }
      ]
    },
    {
      "heading": "TikTok: reaching people who don't know you yet",
      "blocks": [
        {
          "kind": "p",
          "text": "TikTok's main feed is built around recommendations, so videos are shown to people based on their interests, not only to your followers (source: TikTok, \"How TikTok recommends videos #ForYou\" [Owner to confirm link]). That makes it a way to reach people who have never heard of you, if you can post short videos consistently."
        },
        {
          "kind": "p",
          "text": "What tends to suit a local business: quick how-to tips, myth-busting (\"three reasons customers can't find you on Google\"), before-and-after transformations and behind-the-scenes clips. Show a customer's home, face or business only with their written permission."
        },
        {
          "kind": "p",
          "text": "Two cautions. It asks for the most effort of the three, because it runs on frequent video. And TikTok's legal status in the US has been the subject of federal law and court cases since 2024 [Owner to confirm link], so check where things stand before you make it your main channel."
        },
        {
          "kind": "p",
          "text": "**Often a good fit for:** businesses with something to show in motion, and owners comfortable on camera."
        }
      ]
    },
    {
      "heading": "Side by side",
      "blocks": [
        {
          "kind": "table",
          "header": [
            "",
            "Facebook",
            "Instagram",
            "TikTok"
          ],
          "rows": [
            [
              "Main format",
              "Posts, photos, events, video",
              "Photos, Reels, Stories",
              "Short vertical video"
            ],
            [
              "How new people find you",
              "Groups, shares, ads",
              "Reels, location tags, ads",
              "The recommendation feed, ads"
            ],
            [
              "Weekly effort",
              "Low to medium",
              "Medium",
              "High"
            ],
            [
              "Works best when",
              "Customers are local residents who ask neighbors",
              "The work is visual",
              "You can film often"
            ]
          ]
        }
      ]
    },
    {
      "heading": "How much to post, and when to judge it",
      "blocks": [
        {
          "kind": "p",
          "text": "Choose one main platform and post on a schedule you can keep. For short video, we suggest four to five videos a week for at least 90 days before deciding whether it's working; judging after two weeks tells you very little. Film once and reuse the same vertical video on Reels, TikTok and YouTube Shorts."
        },
        {
          "kind": "p",
          "text": "Measure customers, not views. Views tell you a video was seen; \"How did you hear about us?\" tells you whether it brought in work."
        }
      ]
    },
    {
      "heading": "Rules that apply on every platform",
      "blocks": [
        {
          "kind": "ul",
          "items": [
            "**Same name, phone and website** on every profile as on your Google Business Profile.",
            "**Written permission** before showing any customer, their home or their business.",
            "**No bought followers, likes or reviews.** The FTC's 2024 rule on reviews and testimonials also bans buying or selling fake indicators of social media influence for commercial purposes (source: FTC, 16 CFR Part 465 [Owner to confirm link]).",
            "**Every post should lead somewhere that works:** a booking page, a phone number, a website that loads."
          ]
        },
        {
          "kind": "p",
          "text": "If you'd rather hand this off, SarayaTech is a [Columbus digital marketing agency](/) that [plans, makes and posts your social media](/services/social-media-marketing) each month."
        }
      ]
    },
    {
      "heading": "Check where your posts send people",
      "blocks": [
        {
          "kind": "p",
          "text": "Every post sends people to your website or Google profile, so make sure those work first. [Request a free audit](/free-audit) and we'll review both and tell you what we'd fix first."
        }
      ]
    }
  ],
  "approved": APPROVED,
  "ownerReview": [
    "Owner approves the draft (MO-46). Owner checks each [VERIFY LINK] on the day of publishing, in particular TikTok's current US status. Delete the agency paragraph if C9 says social media is not sold.",
    "Owner input: C9: confirm social media management and paid ads are sold today (the article links to both pages)",
    "Owner input: C16: confirm the free-audit wording",
    "Set the publication date (YYYY-MM-DD) when approving; the draft has none.",
    "Replace each [Owner to confirm ...] marker; the build refuses an approved post that still has one."
  ]
};

/** The only export the app reads. null while unapproved, so a draft is dropped from the bundle. */
export const POST: BlogPost | null = APPROVED ? POST_SOURCE : null;
