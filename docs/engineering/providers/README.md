# Payment providers in the UMOA — the shortlist, audited

*Audit date: 2026-08-27. Every fact below was read from a primary source — the BCEAO's own register, the
provider's own documentation, or the provider's own SDK source — and is cited. What could not be verified
says so. A provider dossier that reassures is worse than none.*

## Start from the register, not from a landing page

Since BCEAO Instruction n°001-01-2024 and the end of the transition period on 1 May 2025, providing a payment
service in the UMOA **requires** approval as an *établissement de paiement*. The register is public and is the
first filter to apply to any candidate:
[Liste des établissements de paiement agréés dans l'UMOA](https://www.bceao.int/fr/communique-presse/liste-des-etablissements-de-paiement-agrees-dans-lumoa-au-28-fevrier-2026).

At 28 February 2026 it holds **30 institutions**: Bénin 2, Burkina 2, Côte d'Ivoire 9, Guinée-Bissau 1,
Mali 2, Sénégal 11, Togo 3.

**The approval is per country, not passported.** The register itself is the evidence: JULAYA appears three
times (Bénin, Côte d'Ivoire, Sénégal), INTOUCH four times (Burkina, Guinée-Bissau, Mali, Togo), DUNYA and
DJAMO twice each. Groups that already hold an approval in one member state still obtained a separate one in
each additional state. Treat this as a strong inference from the register, not as legal advice — **collecting
in Senegal through an institution approved only in Côte d'Ivoire is a question for a lawyer, before it is a
question for an engineer.**

Notable by their absence from the payment-institution register: **PayDunya**, **FedaPay**, **Wave** and
**Orange Money** — which may hold a different authorisation (e-money institution, or a bank partnership) or
none. Verify before assuming.

## The shortlist, on the criteria that decide

Only providers with a public developer API are listed; the register also contains e-money and transfer
operators that are not payment gateways.

| | **Flutterwave Sénégal** | **Bictorys** | **CinetPay** |
| --- | --- | --- | --- |
| BCEAO approval | `EP.SN.004/2025` · 22/05/25 | `EP.SN.003/2025` · 20/05/25 | `EP.CI.007/2025` · 29/08/25 — **Côte d'Ivoire only** |
| Approved in Senegal | **yes** | **yes** | **no** |
| Webhook authentication | **HMAC-SHA256 over the raw body**, base64, `flutterwave-signature` | shared secret echoed in `X-Secret-Key` — **no signature, no timestamp** | shared notify token — but see below |
| Read-back enforced | no (signature makes it optional) | no — and the vendor's sample has the order-binding check commented out | **yes, in the official SDK**: it re-fetches the canonical payment and compares identifiers before returning |
| Event id / dedupe key | `id` (`wbk_…`) + `type` + `timestamp` | transaction `id` | transaction ids |
| Delivery contract | **documented**: 60 s timeout, 3 retries, 30-minute interval | undocumented | undocumented |
| Idempotency | **`X-Idempotency-Key` on all POST** — transactions, transfers, customers **and refunds**; replay answers `X-Idempotency-Cache-Hit: true` | payouts only — **not** charges, **not** refunds | not present in the SDK |
| API auth | OAuth 2.0 client-credentials, short-lived bearer | static `X-Api-Key` | API key |
| Sandbox | yes (test data archived after 30 days) | yes (`api.test.bictorys.com`) | yes (`api.cinetpay.net`) |
| Public status page | **`status.flutterwave.com`**, with incident subscriptions | none | none |
| Official public SDKs | **28 repositories** | **0** — the org exists and is empty; "SDK disponible à la demande" | **10**, actively maintained, including an MCP server |
| Senegal mobile money | Orange, Free Money, Wave | Orange Money, Wave, cards | (Côte d'Ivoire: MTN, Orange, Wave) |
| Documented rate limits | not found | **page exists and is empty** | not found |

Sources: [Flutterwave webhooks](https://developer.flutterwave.com/docs/webhooks) ·
[Flutterwave idempotency](https://developer.flutterwave.com/docs/idempotency) ·
[Flutterwave mobile money by country](https://flutterwave.com/ng/support/payment-methods/pay-with-mobile-money) ·
[Bictorys webhook validation](https://docs.bictorys.com/docs/how-to-validate-webhooks) ·
[CinetPay `WebhookService`](https://github.com/cinetpay/cinetpay-php-sdk/blob/HEAD/src/Service/WebhookService.php).

### What CinetPay gets right, and every team should copy

Its official SDK does not hand you the webhook body. It verifies the notify token in **constant time**, then
**re-fetches the canonical payment from the API** and refuses the event if the identifiers disagree — so the
object your code receives came from the API, not from the request. That is the correct architecture for a
provider without a payload signature, shipped as the default path rather than left as an exercise. It is the
same rule this repo prescribes as `read-back` in `agents/payments-engineer.md`.

Note also that `docs.cinetpay.com` currently returns **NXDOMAIN** on both Cloudflare's and Google's public
resolvers, while the SDKs remain live and current (PHP SDK pushed 2026-08-11). Their documentation site is
what search engines index; plan on reading the SDK source instead.

## Recommendation

**Run two rails, and make the safe integration the default on both.**

1. **Flutterwave Sénégal as the primary.** It is approved in Senegal, it covers Orange Money, Free Money and
   Wave in XOF, and it is the only candidate that gives you all four of: a real payload signature, an
   idempotency key that covers **refunds**, a documented retry/timeout contract, and a public status page.
   Those are precisely the four things whose absence forces compensating work everywhere else.

2. **Bictorys as the second rail.** Approved in Senegal, locally focused, broad API surface (subscriptions,
   BNPL, invoices, payment links, batch payouts). Behind the four-rule contract in
   [`bictorys.md`](bictorys.md) — of which **read-back** is load-bearing — its webhook weakness stops being
   decisive. What the contract does *not* fix and you must live with: no idempotency on refunds, no status
   page, no published rate limits, no public SDK.

A second rail is not belt-and-braces in this market. Mobile-money links break one operator at a time, and the
ability to route a XOF charge to another PSP is worth more than any single provider's uptime claim.

**CinetPay is the best-engineered of the three and is not recommended for collecting in Senegal**, on the
regulatory point alone. It is the natural first choice for Côte d'Ivoire.

### What NOT to conclude from this page

Flutterwave carries **counterparty risk that Bictorys does not**, and it would be dishonest to rank it first
without saying so:

- In October 2023 it disclosed unauthorised transfers by PoS merchants of about **₦19 bn (~$24 M)**, and a
  further reported **₦11 bn (~$7.2 M)** in April 2024. These were internal-control failures, not breaches of
  the merchant API, but they are real and they are large.
- Kenyan asset-freeze proceedings over money-laundering and fraud allegations were **withdrawn and the
  company cleared** by the High Court in November 2023, with the funds released. The allegations did not
  stand.
- In July 2025 it cut roughly **half its staff in Kenya and South Africa** to refocus on Nigeria. It obtained
  its Senegal approval two months earlier. A provider retrenching toward its core market is a continuity
  question for francophone West Africa, and it is the strongest argument for not depending on it alone.

None of that is a reason to avoid it; all of it is a reason to keep the second rail warm and to hold the
commercial terms in writing.

## Combining providers — and the PCI trap nobody mentions

**Both providers take cards.** Flutterwave supports Mastercard, Visa, American Express, Verve and Afrigo with
3DS/VBVSECURECODE and card tokenisation; Bictorys supports cards through its hosted Checkout. So the split is
not "one does mobile money, the other does cards". The real dividing line is **where the card number goes**,
and it decides your PCI scope — which is a compliance obligation, not an implementation detail.

| | hosted page (card number never touches you) | webhook signature | idempotency incl. refunds |
| --- | --- | --- | --- |
| **Flutterwave v4** (`/orchestration/direct-charges`) | **no** — the request body carries `encrypted_card_number`, `encrypted_cvv`; there is no hosted checkout anywhere in the v4 documentation index | **yes**, HMAC-SHA256 | **yes** |
| **Flutterwave v3 Standard** (`checkout.flutterwave.com/v3/hosted/pay/…`) | **yes** — redirect flow | **no** — static `verif-hash` secret | no |
| **Bictorys Checkout** | **yes** — redirect flow | **no** — static `X-Secret-Key` | no |
| **Bictorys Direct API (card)** | no — and Bictorys says so plainly: *"L'intégration Direct API requiert une certification PCI DSS pour le paiement carte bancaire"* | no | no |

**No single option today gives you all three.** That is the honest state of this market, and it is the reason
the answer is a combination rather than a provider.

Read the Flutterwave v4 encryption requirement carefully before choosing it for cards. The docs say to pass
your encryption key to one of their **backend** SDKs (Node, Python, Java, PHP) and AES-256 the card fields. A
symmetric key cannot live in a browser, so in practice **the raw PAN reaches your server** — that is SAQ-D
territory, the heaviest PCI obligation there is, and it is a very different commitment from the SAQ-A you get
by redirecting to a hosted page. v4's excellent webhook signature does not buy that back.

### The combination that actually follows

- **Cards → a hosted checkout**, always. Bictorys Checkout or Flutterwave v3 Standard. You stay SAQ-A, no
  card data touches your infrastructure, and 3DS is the provider's problem. Accept the static-secret webhook
  and answer it with **read-back** — which you are doing anyway.
- **Mobile money → the API**, where there is no PAN and therefore no PCI question at all. Here Flutterwave v4
  is the better engine: real signature, `X-Idempotency-Key` on every POST, a documented retry contract.
- **Never Flutterwave v4 direct card charges** unless someone has decided, in writing, to take on SAQ-D.

Note that Flutterwave's own v3 documentation tells you to "always re-query the Flutterwave API to verify the
transaction details" before giving value. Both markets' providers converge on the same instruction. It is the
`read-back` rule, and it is the one thing every integration here must implement.

### What that costs you in code

One port, two adapters, and a routing table — not two integrations.

- **One internal payment model.** `provider`, `provider_transaction_id`, `reference`, `amount_minor`,
  `currency`, `exponent`, `settled_amount_minor`, `settled_currency`, `status`. Nothing provider-shaped leaks
  past the adapter.
- **One `provider_events` table** with a unique constraint on `(provider, provider_event_id)`, written before
  any side effect. Both providers deliver at least once and neither guarantees order.
- **Each adapter ends at read-back.** The adapter's contract is: given a webhook, return a payment fetched
  from that provider's API. What it received on the wire never leaves the adapter.
- **A routing table keyed on `(method, currency, country)`** with an ordered list of providers, and a manual
  kill switch per route. That switch is the entire point of the second rail: when one operator's mobile-money
  link is down, routing is a config change, not a deploy.
- **Reconcile per provider, separately.** A sweep that only covers the primary is how a silent failure on the
  secondary becomes a customer's phone call.

Two providers is roughly one extra adapter and one routing table over a single integration — provided the
port exists from day one. Retrofitting the port after a single-provider integration has spread through the
codebase costs far more, which is the argument for doing it at the start even if you launch with one rail.

## Before signing, with any of them

These are commercial and legal questions. No agent closes them from a web search — see
`skills/originality-check` for the same rule applied to naming.

- The provider's **own PCI-DSS Attestation of Compliance**, if card volume will pass through them.
- **Settlement timing and currency**, in writing. Watch for `amount`/`currency` differing from
  `settledAmount`/`settledCurrency`; reconcile against the right pair.
- **Pricing**, including FX spread — the spread is usually the real cost, not the percentage.
- **SLA, incident history and support response times.** Where there is no status page, ask for the last
  twelve months of incidents.
- **Chargeback and dispute process**, and who bears the loss.

## Adding a provider

Write a dossier here before writing the integration. The questions it must answer are the columns of the
table above; they are cheaper to answer before the code than after the incident.
