upstream:         usestrix/strix
upstream_path:    skills/
upstream_sha:     2cc816781438f2993bcbb5c8cf3f693c25380142
upstream_license: Apache-2.0 — vendor/skills/strix/LICENSE (the repository's own top-level LICENSE)
vendored:         2026-08-28
audit:            docs/engineering/tools/strix.md — read line by line before vendoring, not after
modified:
  - **The install command was changed in two files** (`penetration-testing-with-strix`,
    `ci-security-scanning-with-strix`): upstream instructs `curl -sSL https://strix.ai/install | bash`.
    That installer is competently written — `set -euo pipefail`, no `sudo`, installs to `$HOME/.strix/bin`,
    and pins the sandbox image to `ghcr.io/usestrix/strix-sandbox:1.3.0` — but it resolves
    `releases/latest` and performs **no checksum and no signature check** (`verify_installation()` is a
    `--version` smoke test). Vendoring instructions that tell an agent to pipe an unpinned, unverified
    binary into a shell would defeat the point of vendoring them. Replaced with
    `pipx install strix-agent==1.5.3`, which upstream itself offers as the alternative. Each edit is marked
    `# VANTRY:` in place and states what upstream said.
  - `CONFLICTS.md` was added, recording why these nine are **reference material, not auto-invoked skills**,
    and where their scope overlaps this repo's own playbooks.
  - No other line of any upstream body was edited. Apache-2.0 §4(b) notice: this is a modified
    distribution — the modifications are the install lines above and the file added beside them.
  - Apache-2.0 §6 grants no trademark rights: "Strix" must not appear in Vantry branding, and these files
    must not be presented as endorsed by usestrix.

not_mirrored:     `scripts/sync-adapters.sh` does not copy `vendor/` into `.claude/skills/`, so none of these
                  is auto-invoked. That is deliberate — see CONFLICTS.md. They are cited by
                  `agents/security-engineer.md` and read on purpose.

upstream_files:   the nine SKILL.md files, SHA-256 **as audited upstream**, before the install edit:
  720eb63825eda668…  api-security-testing
  5aad863f88d7b21a…  application-security-testing
  25758e5fd2565285…  ci-security-scanning-with-strix          (edited: install line)
  2633d6b575406e5b…  find-security-vulnerabilities-in-code
  6be75ecea9dd9daa…  fix-security-vulnerabilities-with-strix
  de2da9ea13dd832c…  managed-pentesting-with-strix
  257dddbcd7a112bd…  owasp-top-10-testing
  55710c0e66138059…  penetration-testing-with-strix           (edited: install line)
  7b345118ed8ec992…  web-app-penetration-testing

refresh:          one skill at a time, through `dependency-upgrade`. Never a bulk update: these are
                  instructions that run in an agent's judgement with the session's permissions, and there is
                  no CVE database for prose. Re-read the diff, re-run the checks in
                  docs/engineering/tools/strix.md §3, then re-record with
                  `scripts/check-vendored.sh --update`.
