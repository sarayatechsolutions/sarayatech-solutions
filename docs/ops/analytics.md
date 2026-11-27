# Runbook: analytics (GA4) with consent (STS-050, REQ-043)

**Who does this:** the owner supplies the GA4 measurement id (owner input **C17**) and approves the
privacy wording; a developer or the owner sets the id and redeploys.

**State today:** analytics is **OFF**. No GA4 id is configured, so the site loads no Google script,
sets no cookie, writes nothing to browser storage, makes no analytics request and shows no banner.
The code is in `src/lib/analytics.ts`; the switch is `src/config/analytics.ts`.

## 1. Turn it on

1. **Owner:** create a GA4 property (Google Analytics > Admin > Create property > Web stream) and
   copy the measurement id. It looks like `G-XXXXXXXXXX`.
2. **Owner (legal, before step 3):** approve the analytics wording of the Privacy Policy. Build the
   site with the id once (step 3 on a preview branch) and read `/privacy`: the "Cookies, analytics and
   tracking" section and the "Who receives your information" list switch automatically to the
   Google Analytics text. That text is a draft with an `[Owner to confirm: ... (C17)]` placeholder;
   it is in `src/content/legal/privacy.ts` (`cookieBullets`). `LEGAL_PAGES_APPROVED` stays `false`
   until the owner or a lawyer approves the whole policy.
3. **Set the id, one of:**
   - **Cloudflare Pages (preferred, no code change):** Workers & Pages > the site > Settings >
     Variables and Secrets (Environment variables) > add `VITE_GA4_ID` = `G-XXXXXXXXXX` for
     **Production** (and Preview if you want to test there). It is a public value, not a secret.
   - **Or in code:** set `ga4Id: "G-XXXXXXXXXX"` in `src/config/business.ts` (C17). This wins over
     the environment variable.
4. **Redeploy.** Vite inlines the id at build time; changing the variable does nothing until a new
   build runs (Deployments > Retry deployment, or push a commit).
5. **CSP:** apply the additions in section 5 in the same deploy, or the Report-Only policy will
   report every Google request.
6. **Owner, in GA4 (STS-070):** Admin > Data streams > the web stream > Enhanced measurement > the
   gear icon. Turn **off** "Page changes based on browser history events", "Site search" and "Form
   interactions". The site sends its own `page_view` on each route change, with the query string and
   fragment removed; Google's history-based page views would send the full URL instead (a
   `/contact?email=...` link included) and count every page twice. "Site search" sends query
   parameters; "Form interactions" sends form field names and ids. Scrolls and outbound clicks can
   stay on: when a visitor declines, the site also sets Google's own opt-out
   (`window["ga-disable-<id>"] = true`, STS-076), which stops those automatic events too, on the same
   page, before any reload.
7. **Check it** (section 6).

The id must match `^G-[A-Z0-9]{4,12}$`. Anything else (a typo, a `UA-` or `GTM-` id, a placeholder)
is treated as unset and analytics stays off. To turn analytics off again, remove the variable (or
set `ga4Id` back to `null`) and redeploy.

## 2. Consent behaviour

| visitor state | what happens |
| --- | --- |
| no id configured | nothing at all: no banner, no script, no cookie, no storage write, no network |
| id set, first visit | a small banner ("Analytics cookies") at the bottom with **Accept** and **Decline** (same size and colour, 44 px tall) and a link to `/privacy`. Nothing from Google loads |
| clicks **Decline** | `localStorage["sts_analytics_consent"] = "denied"`. The banner goes away and never returns on that browser; Google is never loaded |
| clicks **Accept** | `localStorage["sts_analytics_consent"] = "granted"`, then the gtag script for the id is injected once and a `page_view` is sent |
| later visits | the stored choice is applied silently; no banner |

When Google is loaded, the order is: Consent Mode v2 `default` with `ad_storage`, `ad_user_data`,
`ad_personalization` and `analytics_storage` all `denied`; then `update` with only
`analytics_storage: granted`; then `config` with `anonymize_ip: true`,
`allow_google_signals: false`, `allow_ad_personalization_signals: false` and
`send_page_view: false` (page views are sent by the app on each route change, path only, no query
string or hash).

The banner is a named, non-modal region (not a dialog, no focus trap). It sits above the chat
launcher on phones and in the bottom-left corner from 640 px up, so it never covers the launcher.
It is rendered only in the browser: the prerendered HTML never contains it, or any Google tag,
whether or not an id is set (`tests/smoke/smoke.mjs` `ANALYTICS_HTML_MARKERS` checks every built
HTML file).

To change a choice, a visitor uses the **Cookie settings** button in the footer's Legal list (shown
only when an id is set; STS-071). It shows the banner again and moves focus to it. **Decline** from
there stores `denied`, sends a Consent Mode `update` with `analytics_storage: denied` if gtag was
loaded, and expires the `_ga` and `_ga_<stream>` cookies on the host and each parent domain. From
that moment the site hands nothing more to gtag: no page view, no click, no lead (security
addendum 5, A5-1), and Google's per-property opt-out `window["ga-disable-<id>"]` is set, so gtag.js
stops its own automatic events too (STS-076). The gtag script already on the page stays until the
next page load, idle and with storage denied; after a reload it is not loaded at all. Accepting again on the same page sends
a Consent Mode `update` with `analytics_storage: granted`, clears the opt-out and resumes sending, with no second script.

The referrer handed to Google is the referring site's origin only (`https://example.org`), never
its path or query (A5-3).

## 3. Events

No event ever carries personal data. Every parameter is checked against a fixed list of allowed
values (`EVENT_SCHEMA` in `src/lib/analytics.ts`); unknown events, unknown parameters and any value
outside its list are dropped before anything is sent. Names, emails, phone numbers, messages,
company names, websites and the "source" free text can never be sent. Nothing is sent before
consent.

| event | fires when | parameters (only these, only these values) | hooked in |
| --- | --- | --- | --- |
| `page_view` | each route, after consent | `page_path` (path only), `page_location` (origin + path), `page_title` | `src/components/Analytics.tsx` |
| `generate_lead` | the contact or free-audit form submit **succeeds** (never on a validation error or failed send) | `form`: `contact` \| `audit`; `lead_source` (only if chosen): `google` \| `referral` \| `social` \| `ads` \| `other` (`src/content/forms/lead-source.ts`) | `src/pages/Contact.tsx`, `src/pages/FreeAudit.tsx` (success path only) |
| `cta_click` | a click on a primary booking or consultation CTA | `cta`: `header_cta` \| `hero_consultation` \| `final_consultation` \| `final_audit` | `data-track-cta` on the links: `Header.tsx`, `home/HeroSection.tsx`, `FinalCta.tsx` (via `home/CtaLink.tsx`) |
| `contact_click` | a click on a `tel:`, `sms:` or `mailto:` link (none render until C2/C3 are supplied) | `method`: `phone` \| `sms` \| `email`; `location` (if the link has `data-cta-location`): `header` \| `menu` \| `footer` \| `contact` | any such link, by URL scheme |

In GA4, mark `generate_lead` as a **key event** (Admin > Events). That is an owner click, not code.
`cta_click` and `contact_click` are intent signals, not bookings or calls.

## 4. Adding an event later

Add it to `EVENT_SCHEMA` with an enum for every parameter, never a free-text one, and add a test in
`src/lib/analytics.test.ts` that passes PII-looking extra fields and asserts they are dropped.

## 5. CSP (decision: documented here, `public/_headers` NOT changed yet)

`public/_headers` ships `Content-Security-Policy-Report-Only` with `script-src 'self'`. While the
id is unset no Google request exists, so the policy needs nothing. Loosening it now would allow
Google hosts for no reason. It is **Report-Only**, so even with an id set it would report, not
block; but apply these additions in the same deploy that sets the id, so the reports stay
meaningful. Add the hosts to the existing directives, do not replace them:

```
script-src  'self' https://www.googletagmanager.com
connect-src 'self' https://*.sarayatechsolutions.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com
img-src     'self' data: blob: https://i.pravatar.cc https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com
```

No `'unsafe-inline'` is needed: the gtag stub is defined in the site's own bundle, not in an inline
script. `public/_headers` is a sensitive path (`vantry.yml`), so the change needs a security review.
Watch the browser console for CSP reports after the deploy; Google occasionally adds a regional
collection host, which the wildcards above cover.

## 6. Check it after turning it on

1. Open the site in a private window. **Expected:** the banner shows; DevTools > Network shows no
   request to `googletagmanager.com` or `google-analytics.com`; Application > Cookies shows no `_ga`.
2. Click **Decline**, reload. **Expected:** no banner, still no Google request.
   Then, in a window where you accepted, click **Cookie settings** in the footer, then **Decline**.
   **Expected:** Application > Cookies shows no `_ga` cookie; clicking around before any reload sends
   no new `collect` request, scrolls included (`ga-disable-<id>` is `true` in the console); after a
   reload, no Google request (STS-071, A5-1, STS-076).
   **If a `collect` request still appears** on that same page after the Decline (for example on a
   scroll or an outbound click), Google is not promising to stop its own automatic events once the
   tag has loaded (A7-1). Do one of these, then repeat this step:
   - in GA4 > Admin > Data streams > Enhanced measurement, turn off **Scrolls** and
     **Outbound clicks** (the site does not use them); or
   - ask for a code change so that a Decline following an earlier Accept reloads the page, which
     removes gtag.js.
3. In a new private window click **Accept**. **Expected:** one request for
   `gtag/js?id=G-...`, then `collect` requests; `_ga` cookies appear.
4. With GA4 DebugView open (or the Google Tag Assistant extension), click a "Book a Free
   Consultation" / "Get My Free Audit" button and submit a test form with the owner's own details.
   **Expected:** `cta_click` and `generate_lead` arrive with only the parameters in section 3, and
   no name, email or message anywhere.
   Open `/contact?email=test@example.com#x`. **Expected:** in DebugView and in the `collect`
   requests, `dl` (page_location) is `https://<host>/contact`, with no `?`, no `#` and no email
   (STS-070).
5. Submit the form with the backend unreachable. **Expected:** no `generate_lead`.
6. Record what you saw with `scripts/verify.sh --observe`.

## 7. Known gaps (follow-ups, not done by STS-050)

- The analytics privacy wording is a draft (C17); the owner or a lawyer must approve it.
- `docs/website-remediation/07-ANALYTICS-AND-SEO.md` section 1.3 proposed other event names
  (`booking_click`, `phone_click`, `lead_type`, `source_page`, ...). This table is the contract that
  shipped; update 07 to match.
