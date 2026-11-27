# Owner-gated content: how to publish (STS-055, STS-042, STS-043)

Three features are fully built and tested but have **no public page today**. Nothing appears on the
site, in the sitemap or in the prerender output until the owner approves a post or fills a list. The
rule behind all three: the site never publishes an unconfirmed fact or an unapproved article.

| Feature | Public today | Switch | Where |
| --- | --- | --- | --- |
| Blog posts at `/insights/<slug>` | none (5 drafts, `approved: false`) | `APPROVED = true` per post, after every placeholder is resolved | `src/content/insights/posts/<slug>.ts` |
| Industry pages at `/industries/<slug>` | none (`INDUSTRY_PAGES` is empty) | add an entry, and remove two lines from `_redirects` | `src/content/industries/industries.ts` |
| Service-area pages at `/locations/<slug>` | none (`SERVICE_AREAS` is empty) | add a confirmed entry with its own intro | `src/content/locations/locations.ts` |

Run `npm run build` after any change below, and check the new URL in `dist/` and in `dist/sitemap.xml`.

## 1. Blog (STS-055)

The five drafts come from `docs/website-remediation/content-drafts/blog/`. Their `[Owner to confirm: ...]`
placeholders are kept on purpose.

To publish a post:

1. Open `src/content/insights/posts/<slug>.ts`. Its header comment lists the owner inputs (`ownerReview`).
2. Replace every `[Owner to confirm: ...]` with the confirmed fact, or delete the sentence. Also fix every
   `[Owner to confirm link]`. Remove the `callout` blocks. Review the text yourself, as the post carries the
   business's name.
   Every link in the text must be either an internal path with a single leading `/` (for example
   `[free audit](/free-audit)`) or a full `https://` URL. Anything else (`http://`, `//host`, `mailto:`,
   `javascript:`, `data:` or a relative path) is shown as plain text, and the post will not publish
   (A7-2).
3. Set `date` to the publication day, `YYYY-MM-DD`.
4. Change `const APPROVED = false` to `true`.
5. Build. The post is then routed, prerendered, in the sitemap, listed on `/insights`, and `/insights`
   becomes indexable (the `noindex` is dropped when the first post is public).

A post with a marker left in any visible text (title, description, intro, headings, lists, tables) is
**not published even if `APPROVED` is true**. The same holds for a link target that is not an internal
path or an `https://` URL. `blog.test.ts` proves both, and the build smoke test also rejects
a marker on any live `/insights/<slug>`. `ownerReview` notes are never rendered.

Do not import `postSources.ts` from the app. It exists for tests, so unapproved draft text stays out of
the client bundle.

## 2. Industry pages (STS-042, GAP-01, C18)

1. Confirm the industries and the facts for each (C18 in `06-OWNER-INPUTS.md`). Use only facts the owner
   supplied. No invented statistic, client or review.
2. Add one entry to `INDUSTRY_PAGES` in `src/content/industries/industries.ts`: `slug`, `name`, `h1`,
   `metaTitle` (35 to 60 characters), `metaDescription` (100 to 160), `intro`, `sections`, and `services`
   (one or more of the five service slugs). An incomplete entry, an unknown service or a leftover
   `[Owner to confirm ...]` is dropped, not half-published.
3. **Edit `public/_redirects`**: delete the two lines `/industries` and `/industries/` that 301 to
   `/services`. Keep `/industry` and `/industry/*`. Cloudflare applies redirects before pages, so with the
   lines left in, the new pages would be unreachable.
4. Build. `tests/redirects.test.mjs` enforces this both ways: it fails if the redirect is still there while
   a page is live, and fails if it is missing while the list is empty.

The old enterprise industry pages are not revived.

## 3. Service-area pages (STS-043, GAP-02, C5)

1. Confirm in writing which suburbs the business really serves (C5).
2. Add one entry per suburb to `SERVICE_AREAS` in `src/content/locations/locations.ts`, with
   `ownerConfirmed: true`. The path is `/locations/<slug>`.
3. Write a **unique intro** for each (at least 120 characters, from a real project or detail in that area).
   An entry is not rendered if it is unconfirmed, too short, or shares an intro with another entry, which
   includes the same text with only the suburb's name changed. `locations.test.ts` also fails if the real
   list holds two such intros.
4. Add the suburb to `BUSINESS.areas` in `src/config/business.ts`, so the structured data's `areaServed`
   matches the pages.
5. Build and check the URL in `dist/` and the sitemap.

There is no `/locations` hub page. Columbus is covered by the home and service pages.

## 4. Lead retention in the draft Privacy Policy (STS-084, C23)

Confirm how long form submissions stay in the backend's database (the draft says `[Owner to confirm: 365 days (C23)]` in `src/content/legal/privacy.ts`), and set the backend's `LEAD_RETENTION_DAYS` (default 365) to the same number before `LEGAL_PAGES_APPROVED` is set to `true`.

Two limits to know before you approve that sentence:

- **Automatic deletion only happens while the backend's maintenance job runs.** On a Node host it is the
  in-process timer, which is off when `MAINTENANCE_INTERVAL_SECONDS=0`. On Cloudflare Workers it is the cron
  trigger in `wrangler.jsonc`. If you turn either off, old leads stay in the database until it runs again.
  It can also stop on its own (no D1 binding, a config error, the job failing to start, or a failed delete).
  Set an alert in your log tool on these backend log codes: `maintenance_skipped`, `maintenance_failed`,
  `maintenance_start_failed`, `maintenance_disabled`, `maintenance_purge_failed`,
  `maintenance_audit_purge_failed`, `maintenance_claim_failed`, and `config_invalid` (on Workers, the only
  code a cron run logs when it is skipped for a configuration problem).
  `maintenance_run` is logged only when a run actually retried an email or deleted something, so it is quiet
  on a quiet site: do not alert on it going silent. To check the job is alive, look at the cron trigger's
  run history in the Cloudflare dashboard (Workers), or for `maintenance_started` after each restart (Node).
- **The erasure sentence needs a backup window that is true.** The draft says copies in backups and in the
  host's database history are removed "within [Owner to confirm: ... (C23)]". The number you publish must be
  at least the longest of: your backup rotation (the backend's `docs/DEPLOY.md` keeps backups up to
  `LEAD_RETENTION_DAYS`, 365 days by default), any `wrangler d1 export` copy you keep, and D1 Time Travel
  (7 days on the Free plan, 30 on Paid). Shorten the backup rotation first if you want to promise less.
- **CSV files exported from the admin are copies.** The automatic purge and an erasure request do not reach
  them. Delete each export once you no longer need it, and delete the person from any export you still keep
  when you erase them.

## Tests

- `src/content/ownerGated.test.tsx`: each feature with fixtures (routes, prerender list, sitemap, head tags,
  JSON-LD, rendered HTML) and with the empty or unapproved default (nothing public, 404 page).
- `src/content/insights/blog.test.ts`, `src/content/locations/locations.test.ts`: publishing and duplicate rules.
- `tests/redirects.test.mjs`, `tests/smoke/smoke.mjs`: the redirect state, and checks on every gated page in
  a build (one h1, breadcrumb, JSON-LD, no owner marker).
