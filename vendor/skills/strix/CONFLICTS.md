# Strix skills — conflicts with this repo, and why they are not auto-invoked

## They are reference material, not installed skills

`scripts/sync-adapters.sh` does not mirror `vendor/` into `.claude/skills/`, so none of these nine is
auto-invoked. That is a decision, not an omission.

Their `description` fields are written to match broadly — *"Use when the user asks to security-scan,
security-review, or audit their code, repo, or pull request for vulnerabilities"*. Auto-invoked, they would
out-match this repo's own `security-review` and `vulnerability-scan` on almost every security phrasing, and
a request for the gate would silently become a request to run a paid, autonomous exploitation tool against a
live target. The gate must stay the gate.

Read them, and cite them, from `agents/security-engineer.md`.

## Where the scope overlaps, and who owns what

| this repo | Strix | who owns it |
| --- | --- | --- |
| `security-review` — reads a diff, writes a committed verdict that CI checks | agents that exploit a running target | **`security-review` owns the merge gate.** Strix produces evidence a reviewer may cite; it never produces the verdict. |
| `scripts/scan-vulns.sh` — OSV, known-CVE dependencies | not a dependency scanner | **Keep ours.** Upstream agrees: *"Keep a dependency scanner (SCA) and secret scanning in place."* |
| `scripts/scan-quality.sh` — cross-language patterns in the diff | proves reachability by exploiting | Complementary. Static finds candidates; dynamic proves which are real. |
| `.githooks/pre-commit` secret scan | reports secrets it finds in code | **Keep ours** — ours blocks the commit; Strix reports after the fact. |
| `scripts/verify.sh` receipt | `strix_runs/<run>/` report + SARIF | **Never conflate them.** A Strix report is not a receipt and must not be made to look like one. |

## The two hard rules, restated where they will be read

1. **A Strix exit `0` is not evidence.** A budget or turn cap wraps the scan up early; a run that wrapped on
   a warning still records `"completed"` with partial coverage. Treat a result as meaningful only when
   `strix_runs/<run>/run.json` shows `completed` **and** `llm_usage.cost` is comfortably below
   `--max-budget`. Wiring the exit code straight to a merge gate builds a gate that goes green when it runs
   out of money.
2. **A local `-t` path is mounted writable** and the agents can modify it. Run against a clean checkout or a
   `git worktree` — never the tree you are working in, where it would also move `tree_digest` and staleness
   your verification receipt for a reason that looks mysterious.

## Two more things to know before using them

- **Authorization is not a formality.** The agents send real exploit payloads and can change data. Our own
  assets, staging by default, and in writing. Upstream says the same, unprompted, in three of the nine.
- **The managed path (`app.strix.ai`) sends source and asset inventory to a third party.** That is a
  data-residency decision for a human. The self-hosted CLI keeps it local.
