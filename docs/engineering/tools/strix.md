# Strix — audit of the nine agent-skills, and the contract for using them here

*Audit date: 2026-08-28. Target: the nine `SKILL.md` files under `skills/` in `usestrix/strix`, at commit
`2cc8167` (2026-08-20), plus the installer served at `https://strix.ai/install`. Everything below was read
from the source, not from the project's marketing. What was not verified says so.*

**Verdict: the instructions are safe to adopt — and are better written than most vendor documentation.
Adopt them VENDORED, never through `npx skills add`, and never wire a Strix exit code to a merge gate
without the run-completion check in §4.**

---

## 1. What was audited, and what it is

`usestrix/strix` — Apache-2.0, Python, **58 990 stars**, 6 440 forks, created 2025-08-05, last push
2026-08-28, current release **v1.5.3** (2026-08-10, 47 releases on PyPI as `strix-agent`). Actively
developed, not a weekend project.

Strix runs **autonomous AI penetration-testing agents** in a Docker sandbox: they execute the target, drive a
browser and an HTTP proxy, attempt exploitation, and report only findings they proved with a working
proof-of-concept. Two paths on one engine — the self-hosted OSS CLI (your Docker, your LLM key) and the
managed platform at `app.strix.ai`.

Two distinct sets of instructions live in that repo and they have different threat models:

- **`skills/` (nine files)** — agent-skills installed into *your* coding agent, running with *your*
  session's permissions, on *your* machine. **This is what this audit covers.**
- **`strix/skills/` (~30 files)** — the internal prompt library for Strix's own agents, executing inside
  their sandbox against the target. Different blast radius, not audited here.

## 2. What the nine skills actually do

| skill | purpose |
| --- | --- |
| `penetration-testing-with-strix` | the entry point — install, LLM setup, every CLI flag, OSS-vs-cloud choice |
| `managed-pentesting-with-strix` | drive `app.strix.ai` over REST — no local Docker or LLM key |
| `find-security-vulnerabilities-in-code` | white-box review of a repo or a diff |
| `web-app-penetration-testing` | black-box against a live URL |
| `api-security-testing` | REST/GraphQL/gRPC, OWASP API Top 10 (2023) |
| `owasp-top-10-testing` | mapped to OWASP Top 10:2025, with an honest Strong/Partial coverage table |
| `application-security-testing` | picks which of the above an asset needs |
| `fix-security-vulnerabilities-with-strix` | remediate findings, then re-scan to prove the exploit is dead |
| `ci-security-scanning-with-strix` | PR-diff scanning in GitHub Actions / GitLab / any pipeline |

**The command surface is small and it is theirs.** Across all nine files the only binaries invoked are
`strix` (×17), `curl` (×9, to `app.strix.ai` only), `git` (×2, read-only — computing a diff base), plus
`export`, `echo`, `sleep`. No `npx`, no `sudo`, no `rm`, no pipe-to-shell inside the skills themselves.

**Every network host named** is `strix.ai`, `app.strix.ai`, `docs.strix.ai`, `github.com` or `owasp.org` —
plus obvious placeholders (`example.com`, `host.docker.internal`). **No third-party endpoint. No
exfiltration path.**

## 3. What they do NOT do — checked, not assumed

- **No `allowed-tools` in any frontmatter.** Not one of the nine pre-grants a tool permission. Your host
  agent's permission model stays in control, which is exactly what a skill should do and what many do not.
- **Zero mentions** of `.claude/`, `settings.json`, `allowed-tools`, hooks, `CLAUDE.md`, `AGENTS.md`,
  `permissions`, or `.env`. They never touch the host agent's configuration.
- **No instruction to read repository secrets.**
- **No `git commit`, `git push`, `git checkout`, `git reset`, or PR creation.** They do not mutate repo state.
- **No jailbreak shape.** No "ignore previous instructions", no "do this without asking", no
  auto-approve, no `--no-verify`. The greps for those patterns returned only legitimate prose about *auth
  bypass* as a vulnerability class.

The opposite is present, repeatedly and unprompted:

> *"Only test assets the user owns or is authorized to test. Confirm authorization before the first run, and
> prefer staging over production, because the agents send real exploit payloads and can change data."*

> *"Ask the user for anything missing — do not fabricate tokens or scan an API they do not own."*

> *"Do not create these values yourself."* (about API keys)

> *"External domain scans require verification (DNS/file/meta-tag) enforced by the platform — do not try to
> bypass it."*

> *"This is exploit-validated review, not an exhaustive inventory. Keep a dependency scanner (SCA) and secret
> scanning in place."*

That last one matters here: **Strix does not replace `scripts/scan-vulns.sh`**, and its own authors say so.
It is dynamic and proves exploitability; our scanners are static and enumerate known-CVE dependencies and
pattern matches. Complementary, not overlapping.

## 4. The findings

### S1 — HIGH · A Strix exit code `0` is not evidence, and it is exactly our defect class

Their own documentation says it plainly, in three separate skills:

> *"A `0` is not proof of full coverage: if `--max-budget`/`--max-turns` is reached before the scan
> completes, it wraps up early and still exits `0`. … an agent that wrapped up early on a budget *warning*
> still calls `finish_scan` and records `"completed"` — so also sanity-check the run's cost against
> `--max-budget`."*

This is **a check that passes without checking** — the exact failure mode this repo exists to eliminate. A
budget-capped scan reviews part of the diff, finds nothing in that part, and exits `0`. Wire that to a merge
gate and you have built a gate that goes green when it runs out of money.

Credit where it is due: they warn about it, and they ship a CI step that narrows it (`run.json` is
`"stopped"` on a hard cap). But they also state that the narrowing is incomplete. **In this repo the rule is
absolute: a Strix result is advisory until `run.json` says `completed` AND `llm_usage.cost` is comfortably
below `--max-budget`. Anything else is UNVERIFIED.**

### S2 — HIGH · A local target is mounted **writable**; the agents can modify your tree

> *"A local path passed with `-t` is mounted into the sandbox **writable** — the agents can read and modify
> it, so point at a clean checkout, not uncommitted work you care about."*

Two consequences here specifically. First, uncommitted work can be altered by an autonomous agent. Second,
if it changes a tracked file, `tree_digest` moves and **your verification receipt goes stale** — the gate
will block, correctly, but the cause will look mysterious. Run Strix against a **separate clean checkout or
a git worktree**, never against the tree you are working in.

### S3 — MEDIUM · The installer performs no integrity verification

`https://strix.ai/install` is a competent script — `set -euo pipefail`, **no `sudo`**, installs to
`$HOME/.strix/bin`, pins the sandbox image to `ghcr.io/usestrix/strix-sandbox:1.3.0`, and pulls the binary
from `usestrix/strix` GitHub releases. Its `verify_installation()` is a `--version` smoke check, **not an
integrity check**: there is no checksum, no signature, no cosign. It resolves `releases/latest`, so the
version is not pinned either.

Nothing malicious — but `curl … | bash` of an unpinned, unverified binary is not a thing this repo does.
**Use `pipx install strix-agent==1.5.3` instead**, which the entry-point skill already offers as an
alternative. Note also the version skew: CLI 1.5.3, sandbox image 1.3.0.

### S4 — MEDIUM · The managed path sends your code and domains to a third party

`app.strix.ai` is genuinely convenient — no Docker, no LLM key, PR reviews, SOC 2-ready PDF reports. It also
means your source and your asset inventory leave your infrastructure. That is a data-residency and
confidentiality decision for a human, not a convenience choice for an agent. The skills present the
OSS/cloud choice fairly ("neither is better") though they do nudge toward Cloud when unsure.

### S5 — MEDIUM · Cost is unbounded unless you bound it

These are LLM agent loops against a live application. `deep` mode is *hours*. The skills say **"Always set
`--max-budget` unless the user says otherwise"** — good — but the default scan mode is `deep`. For a team
that just spent a release protecting 2 000 CI minutes, a per-PR agentic pentest is a different order of
spend. Decide the budget before the first run, not after the first invoice.

### S6 — LOW · Distribution is via the channel this repo refuses

`npx skills add usestrix/strix` fetches nine instruction files over the network at install time. Our
`AGENTS.md` forbids exactly this — *"Never allowlist the fetcher … the permission prompt in front of a
network-resolved instruction fetch is the entire control."* This is not a criticism of Strix; it is the
ecosystem's default channel. It is a criticism of the channel.

## 5. The contract, if we adopt them

1. **Vendor, never fetch.** `vendor/skills/strix/` with a `VENDOR.md` recording upstream
   `usestrix/strix@2cc8167`, the SHA-256 of each of the nine files, every local modification, and the
   Apache-2.0 licence. Add the path to `sensitive_paths` so a change needs a security review, and let
   `scripts/check-vendored.sh` fail the build if the bytes move. Refresh one skill at a time through
   `dependency-upgrade` — never a bulk update.
2. **`pipx install strix-agent==<version>`.** Never `curl | bash`. Pin, and bump deliberately.
3. **Never against the working tree.** A clean checkout or a `git worktree`, because the mount is writable.
4. **Exit `0` is advisory.** A Strix result becomes evidence only when `run.json` shows `completed` and the
   cost is well under `--max-budget`. It does **not** write a `scripts/verify.sh` receipt and must never be
   made to look like one.
5. **Authorization in writing, staging by default.** The agents send real exploit payloads and can change
   data. Our own assets only.
6. **Budget set before the first run**, and `--scan-mode quick --scope-mode diff` for anything per-PR.
7. **It adds to `security-review`; it does not replace it, and it does not replace `scan-vulns.sh`.** Their
   authors say the same.

## 6. What was not verified

- **The sandbox's actual isolation.** That the Docker sandbox contains the agents is a claim; we did not test
  escape, egress filtering, or what the container can reach on the host network.
- **Finding quality and false-positive rate.** Not measured. "Every finding has a PoC" is their claim; the
  only honest test is running it against something we control and checking the PoCs by hand.
- **The managed platform's security posture and data handling.** No SOC 2 report, DPA, or retention policy
  was reviewed.
- **The internal `strix/skills/` prompt library** (~30 files) that drives their sandboxed agents.
- **Cost in practice** on a real codebase.

## 7. Recommendation

Adopt for **our own repositories and our own staging environments**, vendored, behind the contract in §5.
Start with `find-security-vulnerabilities-in-code` on a clean checkout of one service, `--scan-mode quick`,
a small `--max-budget`, and hand-verify every PoC it returns before trusting any of them. Do not put it in
front of a merge gate until §4's completion check is in the pipeline and has been seen to fail correctly.
