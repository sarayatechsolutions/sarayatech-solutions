# Bictorys — provider dossier

*Audit date: 2026-08-27. Everything below was read from primary sources and is cited. Where a fact could
not be verified, it says so instead of guessing — an unverified claim about a payment provider is worse
than no claim.*

**Verdict: adoptable, as the hosted-checkout provider for XOF/West-African payments, PROVIDED the four
compensating controls in "The integration contract" are implemented. Do not integrate it the way its own
documentation shows.**

---

## 1. What is verified

### It is a licensed payment institution — the strongest signal in the file

The BCEAO's official register of approved payment institutions in the UMOA, *au 28 février 2026*, lists:

```
Sénégal (11)
  DUNYA Digital Payment Sénégal   EP.SN.001/2025   06/05/25
  MIKATY                          EP.SN.002/2025   06/05/25
  BICTORYS                        EP.SN.003/2025   20/05/25
  FLUTTERWAVE Sénégal             EP.SN.004/2025   22/05/25
  …
```

Source: [BCEAO — Liste des établissements de paiement agréés dans l'UMOA](https://www.bceao.int/sites/default/files/2026-03/LISTE%20DES%20ETABLISSEMENTS%20DE%20PAIEMENT%20AGR%C3%89%C3%89S%20DANS%20L%E2%80%99UMOA%20au%2031%20janvier%202026.pdf).

This matters more than any technical detail on this page. Since BCEAO Instruction n°001-01-2024 and the end
of the transition period on 1 May 2025, operating a payment service in the UMOA **without** this approval is
unlawful. Bictorys is the third institution licensed in Senegal, ahead of Flutterwave's local entity. A
regulator has looked at their capital, governance and AML controls. That is a level of assurance no amount
of good API design substitutes for, and it is the reason this dossier ends in "adoptable" rather than "no".

### The API surface is genuinely broad

Charges, 3DS2 card flow with challenge, mobile money, tokenised cards, customers, products, taxes, invoices,
payment links, orders, subscriptions and subscription plans, BNPL, single and **batch** payouts, settlements,
balance, and transaction analytics. 137 documented pages. This is not a thin wrapper over one PSP.

- Auth: `X-Api-Key` header. Three key types — public (frontend-safe), private/secret (server only),
  and a separate webhook secret.
- Live `https://api.bictorys.com` · test `https://api.test.bictorys.com`, switched by a dashboard toggle.
- Errors follow **RFC 7807** (`status`/`title`/`details`/`source`) — a consistent problem shape, which is
  exactly what `AGENTS.md` asks of our own APIs.
- TLS verifies correctly on `api.bictorys.com` and `dashboard.bictorys.com`; plain HTTP is refused (403)
  rather than redirected, which is the safer of the two behaviours.

---

## 2. The findings, ranked

### F1 — CRITICAL · Webhooks have no signature. The "validation" is a shared secret echoed in a header.

Bictorys' documented validation is, in full: read the `X-Secret-Key` header and compare it to the secret
*you chose* in the dashboard.
([how-to-validate-webhooks](https://docs.bictorys.com/docs/how-to-validate-webhooks))

There is **no HMAC over the body, no timestamp, and no nonce**. The consequences are concrete, not
theoretical:

- The secret is transmitted **in every single webhook request**. Every TLS-terminating proxy, WAF, CDN,
  ingress log or APM tool on the path sees a long-lived credential in a header. One misconfigured access
  log leaks it permanently. An HMAC signature is not secret-in-transit; this is.
- Because nothing signs the body, possession of that secret authorises **any** payload: any amount, any
  status, any transaction id.
- With no timestamp, a captured request is replayable forever.
- Their own sample compares with `!==` — a non-constant-time comparison of a secret.

This is materially weaker than Stripe, Paystack or Flutterwave, all of which sign the payload. It is the
single reason this dossier prescribes a different integration from the documented one.

### F2 — HIGH · No idempotency key on charges or refunds

Measured across the OpenAPI parameters of each endpoint:

| endpoint | `idempotency-key` header |
| --- | --- |
| `createpayout` | **yes** — documented, well specified |
| `createbatchpayout` | **yes** (plus `X-Batch-Reference`) |
| `createcharge` | **no** |
| `completecharges` | **no** |
| `refundtransaction` | **no** |

So the money going **out** is protected against a double-send, and the money coming **in** — and, worse,
**refunds** — is not. A timed-out refund request that actually succeeded, retried, is a second refund. The
generic error catalogue mentions `E400-0: Same Idempotency is passed`, but it is copied verbatim onto every
endpoint page and no charge/refund endpoint declares the header, so it cannot be relied on.

### F3 — HIGH · The official webhook sample is not safe to copy

The reference implementation shipped in the docs (the WooCommerce handler):

- **has the merchant-reference check commented out** — the exact check that binds a webhook to *your* order
  is disabled in the sample;
- calls **`sleep(10)`** inside the handler, holding a worker for ten seconds per webhook — a self-inflicted
  denial of service and a guarantee of provider-side timeouts and retries;
- sends `http_response_code(200)` **before** the order processing completes, so several failure paths
  acknowledge as success and the event is never redelivered;
- accepts overpayment silently (`if ($amount_paid < $order_total)` only) and compares money as **floats**;
- runs `sanitize_text_field()` over the raw JSON body before decoding it.

The Node example on [setup-webhook](https://docs.bictorys.com/docs/setup-webhook) is worse: it logs the body
and returns 200 with **no validation at all**, under a note reading "ajoutez des mécanismes
d'authentification si nécessaire".

A team that follows this documentation ships an insecure integration. That is the finding.

### F4 — MEDIUM · Documented rate limits do not exist

`https://docs.bictorys.com/docs/api-rate-limits` is an **empty page** — the title "Limites de taux de l'API"
and nothing else. So there is no published quota, no window, no `Retry-After` contract, and no way to size a
batch payout or a reconciliation sweep except by discovering the limit in production. The same is true of the
top-level `webhook` page.

### F5 — MEDIUM · The webhook payload is not fully public

"L'objet de la payload du webhook est définie dans le **sdk client disponible à la demande**." The docs give
one annotated example, and warn the shape may change without notice. The contract for the most
security-sensitive message in the system is available *on request*.

Note also the shape of that example, because it is a reconciliation trap:

```json
{ "amount": 10, "currency": "EUR", "settledAmount": 6500, "settledCurrency": "XOF" }
```

What the customer paid and what the merchant receives are **different amounts in different currencies** in
the same object. Reconcile against the right pair or every FX transaction will look like a discrepancy.

### F6 — MEDIUM · No public status page, and no SLA found

`status.bictorys.com` does not resolve. There is no published uptime history and no SLA in the public
material. During an incident you cannot distinguish "their outage" from "our bug", and you have no evidence
for a post-mortem. Combined with F4, this makes an independent reconciliation job **mandatory**, not
optional.

### F7 — MEDIUM · No security headers on the merchant dashboard

`https://dashboard.bictorys.com/` returns, over a full GET: no `Strict-Transport-Security`, no
`X-Frame-Options` or CSP `frame-ancestors`, no `X-Content-Type-Options`, no `Referrer-Policy`. This is the
surface where API keys are generated and payouts are initiated. Absent frame-ancestors, clickjacking of an
authenticated session is not mitigated; absent HSTS, a first request can be downgraded. Same for
`bictorys.com`. (`server: istio-envoy` — Kubernetes/Istio, and `X-Amzn-Trace-Id` in the OpenAPI spec, so AWS.)

### F8 — LOW · No official SDK, and thin public footprint

The GitHub org `bictorys` exists with **0 public repositories**. What exists is community work: a Ruby
wrapper by an individual, a WooCommerce plugin under a third-party account, and one npm package
`bictorys-library` at v1.0.1 dated December 2023. No funding announcement, no independent technical review,
and no incident report was found in searches — the absence of complaints is *not* evidence of reliability
here, it is evidence of a small public footprint.

### F9 — LOW · Documentation quality

The Direct API example contains `"country"= "SN"` — JavaScript that does not parse. Screenshots date from
2023. `setup-webhook` opens by warning that its own steps "peuvent varier en fonction des spécificités de
l'API Bictorys". Refunds and payouts are documented as **dashboard click-paths** while the corresponding API
endpoints exist and are documented only in the reference.

---

## 3. The integration contract

Follow this, not the vendor's samples. Each rule answers a numbered finding.

1. **Never trust a webhook body. Re-read the transaction from the API.** (answers F1, F3, F5)
   On every webhook, take only the transaction `id` from the payload and call
   `GET /reference/gettransactiondetails`; the **API response** is the source of truth for amount, currency
   and status. This single rule neutralises the missing signature: a forged webhook cannot survive the
   read-back, because the attacker does not control the API. It also makes the undocumented payload shape a
   non-issue, since you depend on one field.

2. **Treat `X-Secret-Key` as a bearer credential, because that is what it is.** (answers F1)
   ≥32 bytes of entropy; constant-time comparison (`hash_equals`, `crypto.timingSafeEqual`); never logged,
   never in an error, never in an APM trace; rotated on a schedule and immediately if any proxy log is
   suspected. Add the IP allowlist Bictorys offers
   ([Ajouter une adresse IP Privée](https://docs.bictorys.com/docs/getting-your-private-ip-address)).

3. **Own idempotency on our side; use theirs where it exists.** (answers F2)
   A `provider_events` table with a unique constraint on the Bictorys transaction `id`, inserted before any
   side effect — a replay must be a no-op returning the same result. Send `idempotency-key` on
   `createpayout` and `createbatchpayout`. For `refundtransaction`, which has no key, hold a local unique
   refund intent and never issue a second call for the same intent: an unguarded retry is a second refund of
   real money.

4. **Run the reconciliation sweep. It is load-bearing here.** (answers F4, F6)
   No status page and no rate-limit contract means the failure you will meet is a silently missing webhook.
   A daily sweep over `gettransactions` against our own records is how you find it before the customer does.

Plus the ordinary rules of the house, which apply with local specifics:

- **Use hosted Checkout, not Direct API, for cards.** Bictorys states plainly that Direct API card payments
  require *the merchant* to be PCI-DSS certified. Hosted Checkout keeps us at SAQ-A. Direct API remains the
  right call for mobile money, where no card data exists.
- **Money as integers, and store the exponent.** XOF has **no minor unit** (0 decimals) while EUR and USD
  have 2. "Integer minor units" is still the rule; the exponent is per-currency and must be stored, not
  assumed. Store `amount`/`currency` **and** `settledAmount`/`settledCurrency` — they differ (F5).
- **Model the two-hour expiry.** A `pending` charge becomes `expired` after two hours
  ([status responses](https://docs.bictorys.com/docs/status-responses-and-their-meanings)); `expired` is
  final and must be treated as a failure, not left pending forever.
- **Advance state with a conditional update.** Statuses arrive out of order; a late `pending` must never
  overwrite a `succeeded`.

---

## 4. What was NOT verified

State these as open, not as reassurance:

- **PCI-DSS status of Bictorys itself.** No certification, attestation or QSA report was found publicly.
  They require *merchants* to be certified for Direct API card use, which implies they hold scope of their
  own, but that is an inference. **Ask them for the AOC before card volume goes through them.**
- **Uptime, SLA, incident history, support response times.** Nothing public.
- **Financial standing, ownership, funding.** No credible public source found.
- **Settlement timing and pricing.** Not published; obtain in writing.
- **Whether the webhook payload contract is stable.** The docs disclaim it.

These are commercial and legal questions for a human, exactly as `skills/originality-check` says of name and
trademark clearance. Do not let an agent close them from a web search.

---

## 5. Comparison, honestly

Against Stripe or Paystack, Bictorys is behind on **webhook authentication** (no signature), **idempotency
coverage** (charges and refunds unprotected), **operational transparency** (no status page, no published
rate limits) and **developer ergonomics** (no official SDK). None of those are unfixable on our side; the
first three are addressed by the four rules above, at a cost of one extra API read per webhook.

Against the thing that actually matters for XOF and West-African mobile money — Stripe does not serve this
market, and a licensed local institution with Orange Money, Wave and card coverage does. **The regulatory
approval is real, verified against the BCEAO's own register, and it is the deciding factor.**

Recommendation: **adopt, behind the contract in §3**, and get the AOC and the SLA in writing before card
volume.
