// STS-055 blog post: website-features-ohio-industry (REQ-120). DRAFT - OWNER REVIEW. Source: docs/website-remediation/content-drafts/blog/03-website-features-ohio-industry.md
//
// To publish: (1) fill or delete every [Owner to confirm ...] marker below, (2) set `date`,
// (3) change APPROVED to true. Nothing else. Until then the post is not routed, prerendered, linked
// or listed in the sitemap, and (because POST is null) its text is not even in the client bundle.
// See docs/ops/owner-content.md.
import type { BlogPost } from "../blog";

/** Owner approval, in writing (draft README "Publish steps" 3). */
const APPROVED = false;

export const POST_SOURCE: BlogPost = {
  "slug": "website-features-ohio-industry",
  "title": "Website Features That Matter for Ohio Restaurants, Contractors and Salons",
  "metaTitle": "Best Website Features for Ohio Local Businesses",
  "description": "The website features that help an Ohio local business win calls, bookings and visits, with a section each for restaurants, contractors and salons.",
  "date": "",
  "author": {
    "name": "SarayaTech Solutions"
  },
  "topic": "best website features for Ohio [restaurants | contractors | salons]",
  "intro": [
    {
      "kind": "callout",
      "text": "[Owner to confirm: choose industry (C18 / MO-03). Keep \"What every local business site needs\", keep the section for your chosen industry, delete the other two, then swap in the matching H1, meta and slug from the front matter. To cover more than one industry, publish one article per industry rather than one article for all three.]"
    },
    {
      "kind": "p",
      "text": "A website for a local business has one job: turn a visitor into a phone call, a booking or a visit. The features that do that are not the same for a taco shop, a roofer and a salon. Here is what matters, starting with what every local business shares."
    }
  ],
  "sections": [
    {
      "heading": "What every local business site needs",
      "blocks": [
        {
          "kind": "ul",
          "items": [
            "**Tap-to-call at the top.** On a phone, your number should be one tap from the first screen, not buried in the footer.",
            "**Where and when.** Your address or the areas you serve, and your hours, visible without scrolling far. They should match your [Google Business Profile](/services/local-seo) exactly.",
            "**One clear next step.** Call, book or request a quote. If the page asks for five different things, visitors may do none of them.",
            "**Fast and readable on a phone.** Text large enough to read without zooming, and buttons big enough for a thumb.",
            "**Real photos.** Your place, your team, your work. Stock photos tell a customer nothing about you.",
            "**Contact details as text, not inside an image.** A phone number baked into a banner graphic can't be tapped, copied, read aloud by a screen reader or read by a search engine.",
            "**A contact form that really arrives.** Forms break quietly when an email setting changes. Send yourself a test message every month and make sure it lands.",
            "**Accessible to everyone.** Image descriptions, readable contrast and a site that works with a keyboard, following the W3C's accessibility guidelines (WCAG 2.1) [Owner to confirm link]."
          ]
        }
      ]
    },
    {
      "heading": "Restaurants",
      "blocks": [
        {
          "kind": "h3",
          "text": "On the first screen"
        },
        {
          "kind": "p",
          "text": "Today's hours, your address, a tap-to-call button and one button that says what you want guests to do: \"Order online\" or \"Reserve a table\". That button should go straight to the tool you use, not to another page that explains it."
        },
        {
          "kind": "h3",
          "text": "The menu"
        },
        {
          "kind": "p",
          "text": "Put the menu on the page as text, not only as a PDF. A text menu loads faster on a phone, can be read by search engines, and is quicker for you to change. Group it the way guests order (lunch, dinner, drinks), and keep prices and dishes current so nobody orders a dish you stopped making. If you mark vegetarian or gluten-free dishes, keep those labels accurate, and tell guests how to ask about allergies."
        },
        {
          "kind": "h3",
          "text": "Ordering and reservations"
        },
        {
          "kind": "p",
          "text": "Link directly to your ordering or reservation tool, and use the same link on your website, your Google profile and your Instagram. Google lets food businesses add menu, ordering and reservation links to their profile (source: Google Business Profile Help [Owner to confirm link]). Delivery marketplaces charge restaurants their own fees, so if you offer direct ordering, make that the most visible button."
        },
        {
          "kind": "h3",
          "text": "Pages worth having"
        },
        {
          "kind": "ul",
          "items": [
            "**Private events and catering,** with the details you need for a quote: date, number of guests, type of event.",
            "**Gift cards,** if you sell them.",
            "**Your story,** with real photos of the kitchen and the people in it.",
            "**Getting here:** one line on parking or the nearest bus stop saves a phone call."
          ]
        },
        {
          "kind": "h3",
          "text": "Keep it in step with Google"
        },
        {
          "kind": "p",
          "text": "When your hours or menu change, update the website and your Google profile on the same day. Holiday hours and seasonal closures are the ones most often forgotten."
        }
      ]
    },
    {
      "heading": "Contractors",
      "blocks": [
        {
          "kind": "h3",
          "text": "On the first screen"
        },
        {
          "kind": "p",
          "text": "Say what you do and where in one line, for example \"Roof repair and replacement across Columbus\". Below it: a tap-to-call button and a \"Request a quote\" button. A homeowner with water coming through the ceiling should not have to scroll."
        },
        {
          "kind": "h3",
          "text": "Your service area and services"
        },
        {
          "kind": "p",
          "text": "List the cities and neighborhoods you actually cover, and give each main service its own page: roof repair, roof replacement, gutters. Each page can then answer one question well. Don't list areas you don't serve; a lead you have to turn down wastes both your time and theirs."
        },
        {
          "kind": "h3",
          "text": "License and insurance"
        },
        {
          "kind": "p",
          "text": "Ohio licenses certain trades at the state level through the Ohio Construction Industry Licensing Board, and cities, including Columbus, have their own contractor licensing or registration rules (sources: Ohio Department of Commerce [Owner to confirm link]; City of Columbus Building and Zoning Services [Owner to confirm link]). Where a license applies to your work, show the number so homeowners can check it. If you carry insurance, say so, and be ready to send a certificate when asked."
        },
        {
          "kind": "h3",
          "text": "Project photos"
        },
        {
          "kind": "p",
          "text": "Before-and-after photos of real jobs, each with the homeowner's written permission. Caption each one with the type of job and what you did. A gallery of real work says more than a paragraph about quality."
        },
        {
          "kind": "h3",
          "text": "The quote form"
        },
        {
          "kind": "p",
          "text": "Ask only for what you need: the address, the type of job, a photo upload, the timeframe and the best way to reach them. Every extra field gives a busy homeowner a reason to stop. Then tell them what happens next, in words that are true for your business."
        },
        {
          "kind": "h3",
          "text": "Only true promises"
        },
        {
          "kind": "p",
          "text": "Mention emergency service, free estimates, financing or a warranty only if you really offer them, and on the terms you really offer, in writing."
        }
      ]
    },
    {
      "heading": "Salons and barbershops",
      "blocks": [
        {
          "kind": "h3",
          "text": "On the first screen"
        },
        {
          "kind": "p",
          "text": "A \"Book now\" button, your location, hours and phone number. Most visitors arrive wanting to book, so make that the first thing they see."
        },
        {
          "kind": "h3",
          "text": "Booking"
        },
        {
          "kind": "p",
          "text": "Online booking should show real availability, by stylist and by service, so clients can book at 10 p.m. without calling. If you take a deposit, say so before the client reaches the payment step. Confirmation and reminder messages, if your tool sends them, help clients remember their appointment. If no off-the-shelf tool fits the way your salon works, a custom [booking system](/services/app-development) is an option."
        },
        {
          "kind": "h3",
          "text": "The service menu"
        },
        {
          "kind": "p",
          "text": "List each service with its duration and a price or price range. When a price \"starts at\", say what changes it, such as hair length or thickness. For services that need a consultation first, such as a color correction, say that and let clients book the consultation."
        },
        {
          "kind": "h3",
          "text": "Stylist pages"
        },
        {
          "kind": "p",
          "text": "Give each stylist a page or section with their own work, what they specialize in and the days they work. Ask clients for permission before posting photos of them."
        },
        {
          "kind": "h3",
          "text": "Policies, before the booking"
        },
        {
          "kind": "p",
          "text": "Show your cancellation, no-show and late-arrival policies before the client confirms, not in an email afterwards."
        },
        {
          "kind": "h3",
          "text": "Instagram and Google, pointing to the same place"
        },
        {
          "kind": "p",
          "text": "Many clients find a stylist through photos. Put your booking link on your Instagram profile and on your Google profile, so every route ends at the same booking page."
        },
        {
          "kind": "h3",
          "text": "Your license"
        },
        {
          "kind": "p",
          "text": "The Ohio State Cosmetology and Barber Board offers a public license lookup (source: Ohio State Cosmetology and Barber Board [Owner to confirm link]). Showing your license is a simple trust signal."
        }
      ]
    },
    {
      "heading": "Features that can wait",
      "blocks": [
        {
          "kind": "ul",
          "items": [
            "An autoplay video or a slideshow at the top that slows the page down.",
            "A pop-up that covers the phone number.",
            "A chat widget nobody is available to answer.",
            "A blog section with no posts in it."
          ]
        },
        {
          "kind": "p",
          "text": "None of these is wrong forever. They are simply less useful than the basics above, and each one can come later, once a visitor can already call, book or order without effort."
        }
      ]
    },
    {
      "heading": "Test your own site in five minutes",
      "blocks": [
        {
          "kind": "p",
          "text": "Open your website on your phone and time yourself:"
        },
        {
          "kind": "ol",
          "items": [
            "Can you call the business in one tap?",
            "Can you find today's hours in a few seconds?",
            "Can you book, order or request a quote without zooming?",
            "Do the name, address and phone match your Google profile?",
            "Does a test message from your contact form reach your inbox?"
          ]
        },
        {
          "kind": "p",
          "text": "Any \"no\" is the first thing to fix. If you'd like help with the fixes, that is what our [web design in Columbus, Ohio](/services/website-design) service is for."
        }
      ]
    },
    {
      "heading": "Get a second pair of eyes",
      "blocks": [
        {
          "kind": "p",
          "text": "If you'd like someone else to run that check, [request a free audit](/free-audit). We'll review your website and Google profile and tell you what we'd fix first."
        }
      ]
    }
  ],
  "approved": APPROVED,
  "ownerReview": [
    "The industry must match C18 / MO-03 (REQ-120 acceptance: 'Industry matches C18'). Owner chooses one industry (or up to three, one article each), deletes the other industry sections, and uses the matching H1, meta and slug set below. This review copy holds all three industries, so it runs past 1,100 words on purpose; each single-industry article that results is within 700–1,100.",
    "Owner input: C18 / MO-03: choose the target industry or industries",
    "Owner input: C9: confirm app development (booking systems) is sold today (the salon section links to it)",
    "Owner input: C16: confirm the free-audit wording",
    "Slug and metadata above are for this review copy only. Per C18, keep ONE industry section and use that variant's H1, meta and slug from the draft front matter.",
    "Set the publication date (YYYY-MM-DD) when approving; the draft has none.",
    "Replace each [Owner to confirm ...] marker; the build refuses an approved post that still has one."
  ]
};

/** The only export the app reads. null while unapproved, so a draft is dropped from the bundle. */
export const POST: BlogPost | null = APPROVED ? POST_SOURCE : null;
