# Runbook: one canonical host (STS-025, REQ-009, REQ-017)

**Who does this:** the owner, or a helper the owner authorises, in the Cloudflare dashboard. It is
an owner and Cloudflare action. Nothing in this repository can create or change these rules, and a
code deploy does not apply them.

**State of this document:** written from the code and the remediation docs only. Nobody writing it
has looked at the Cloudflare account, the DNS zones or the live responses. Every "today" statement
below comes from `docs/website-remediation/02-BASELINE.md` (the audit), not from a fresh check.
Run the checks in step 4 before and after you change anything, and record what you saw.

## 1. The decision this depends on (B2, C1)

Owner input **B2** (canonical host) is **OPEN**. The site ships with the documented fallback:

| | value | where the code reads it |
| --- | --- | --- |
| canonical host | `https://sarayatechsolutions.com` (apex, no `www`) | `src/seo/seo.ts` `DEFAULT_SITE_URL` (overridable at build with `VITE_SITE_URL`), `src/config/business.ts` `siteUrl` |
| alternate hosts that must redirect to it | `www.sarayatechsolutions.com`, `sarayatech-solutions.dev` | this runbook |

Canonical tags, `og:url`, the sitemap, `robots.txt` and the JSON-LD all use the canonical host.
**If the owner picks `www` instead**, invert every rule below (apex to `www`), set `VITE_SITE_URL`
in the Cloudflare Pages build settings, and redeploy, so the tags and the redirects agree.

The audit (02-BASELINE) found that `www.` and `sarayatech-solutions.dev` serve the same content as
the apex with no redirect. That is the duplicate-content problem this runbook fixes.

## 2. Why this is not in `public/_redirects`

`public/_redirects` (Cloudflare Pages) matches **paths on the host that received the request**. It
cannot match on hostname, so it cannot send `www.example.com/x` to `example.com/x`. It carries the
path-level 301s for retired pages only (STS-039, STS-057, STS-025; checked by
`tests/redirects.test.mjs`). Host-level redirects are a Cloudflare rule. (06-OWNER-INPUTS B2 says
"`www` → apex via `_redirects`"; that wording is superseded by this runbook.)

## 3. Create the rules

Pick **one** mechanism per hostname. Both keep the path and the query string and return **301**.

### 3a. `www.sarayatechsolutions.com` → apex (same zone: a Redirect Rule)

Prerequisite: `www` must resolve through Cloudflare's proxy, or the rule never sees the request.
In **DNS** for the `sarayatechsolutions.com` zone, check that a `www` record exists and is
**Proxied** (orange cloud). If `www` is attached to the Pages project as a custom domain, that
record already exists; keep it proxied.

Then **Rules → Redirect Rules → Create rule** (a "Single Redirect"):

| field | value |
| --- | --- |
| Rule name | `www to apex (STS-025)` |
| When incoming requests match | Custom filter expression: `(http.host eq "www.sarayatechsolutions.com")` |
| Then | Type **Dynamic** |
| Expression | `concat("https://sarayatechsolutions.com", http.request.uri.path)` |
| Status code | **301** |
| Preserve query string | **On** |

The template "Redirect from WWW to root" in the Redirect Rules screen produces the same rule.

### 3b. `sarayatech-solutions.dev` → apex (a different domain: a Bulk Redirect)

A Redirect Rule only acts on its own zone, so a second domain needs either its own zone with its
own Redirect Rule, or an account-level **Bulk Redirect**. Bulk Redirect is the simpler one:

1. Make sure `sarayatech-solutions.dev` (and `www.sarayatech-solutions.dev`, if it is used) has a
   **proxied** DNS record in Cloudflare. Without one, the redirect never runs. Note that `.dev` is
   on the browsers' HSTS preload list: it only ever loads over HTTPS, which Cloudflare's proxy
   certificate covers.
2. **Account home → Bulk Redirects → Create a Bulk Redirect List**, name `canonical_host`, add:

   | Source URL | Target URL | Status | Options |
   | --- | --- | --- | --- |
   | `sarayatech-solutions.dev` | `https://sarayatechsolutions.com` | 301 | Preserve query string, Subpath matching, Preserve path suffix, Include subdomains |

3. **Create a Bulk Redirect Rule** that uses the `canonical_host` list, and deploy it.

"Subpath matching" plus "Preserve path suffix" is what turns `.dev/services/paid-ads` into
`https://sarayatechsolutions.com/services/paid-ads` instead of the home page.

**If ".dev" actually means the Pages default host** (`<project>.pages.dev`, which the account
does not own as a zone), the Bulk Redirect above is also the documented way to redirect it: use the
`<project>.pages.dev` host as the Source URL with the same options. Confirm which host it is in
**Workers & Pages → the project → Custom domains** before you start.

### 3c. What not to do

- Do not redirect everything to the home page. The path must survive (REQ-017).
- Do not stack hops (`.dev` → `www` → apex). Each alternate host goes straight to the canonical one.
- Do not add a host-level rule to `public/_redirects`. The test suite refuses absolute URLs there.

## 4. Check it (`curl -I`)

Run these before the change (to record the starting state) and after it. `-I` sends a HEAD
request and prints only the status line and headers. Each alternate host must answer **301** with a
`location` on the canonical host and **the same path and query**, in **one** hop.

```bash
# www -> apex, path and query kept
curl -sI "https://www.sarayatechsolutions.com/services/paid-ads?utm_source=test" | grep -iE "^HTTP|^location"
# expect: HTTP/2 301
#         location: https://sarayatechsolutions.com/services/paid-ads?utm_source=test

# .dev -> apex, path kept
curl -sI "https://sarayatech-solutions.dev/our-work" | grep -iE "^HTTP|^location"
# expect: HTTP/2 301
#         location: https://sarayatechsolutions.com/our-work

# the root of each alternate host
curl -sI "https://www.sarayatechsolutions.com/" | grep -iE "^HTTP|^location"
curl -sI "https://sarayatech-solutions.dev/" | grep -iE "^HTTP|^location"
# expect: 301 to https://sarayatechsolutions.com/

# the canonical host itself does NOT redirect
curl -sI "https://sarayatechsolutions.com/about" | grep -iE "^HTTP|^location"
# expect: HTTP/2 200 and no location header

# one hop only: follow redirects and count them
curl -sIL -o /dev/null -w "%{num_redirects} hop(s) -> %{url_effective}\n" "https://www.sarayatechsolutions.com/pricing"
# expect: 1 hop(s) -> https://sarayatechsolutions.com/pricing

# a retired page (public/_redirects, not this runbook) also goes in one hop
curl -sIL -o /dev/null -w "%{num_redirects} hop(s) -> %{url_effective}\n" "https://sarayatechsolutions.com/solutions/web-mobile-development"
# expect: 1 hop(s) -> https://sarayatechsolutions.com/services/website-design
```

A retired URL requested on an **alternate** host (`https://www.sarayatechsolutions.com/realisation`)
takes two hops by construction: the host rule, then the path rule. That is acceptable; Google
follows both. Only the hops inside one host must be single.

## 5. After the rules are live

1. Record the `curl -I` output (date, command, status, `location`) in
   `docs/website-remediation/05-EXECUTION-LOG.md`, and set B2 to DONE in `06-OWNER-INPUTS.md`.
2. In Google Search Console, submit `https://sarayatechsolutions.com/sitemap.xml` on the canonical
   property. If the old `.dev` domain should pass on its history, verify it as a property and use
   **Change of Address** only after its 301s are confirmed live (07-ANALYTICS-AND-SEO.md, B2).
3. Run Google's **Rich Results Test** and the **Schema Markup Validator** on the home page and one
   service page (STS-024), now that they are served from the canonical host.

## Rollback

Disable (do not delete) the Redirect Rule or the Bulk Redirect Rule in the dashboard. The site keeps
serving on every host exactly as before; only the redirects stop. Re-run step 4 to confirm.
