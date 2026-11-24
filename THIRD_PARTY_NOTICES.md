# Third-party notices

This repository is distributed. Anything here written by someone else travels with its own terms, and this
file records them. The kit's own code is MIT © 2026 Issa (`LICENSE`); that grant does not discharge anyone
else's.

Everything listed below lives under `vendor/skills/`, is pinned to a commit SHA in its `VENDOR.md`, and is
checked on every verification by `scripts/check-vendored.sh`.

---

## `vendor/skills/strix`

- **Source:** [`usestrix/strix`](https://github.com/usestrix/strix), path `skills/` (nine `SKILL.md` files),
  pinned at `2cc816781438f2993bcbb5c8cf3f693c25380142`
- **Licence:** Apache License 2.0 — full text at `vendor/skills/strix/LICENSE`
- **Copyright:** © Strix (usestrix)
- **Modifications** (Apache-2.0 §4(b)): the install command was changed in
  `penetration-testing-with-strix` and `ci-security-scanning-with-strix` — upstream instructs
  `curl -sSL https://strix.ai/install | bash`, which resolves `releases/latest` and performs no checksum or
  signature check; replaced with `pipx install strix-agent==1.5.3`, the alternative upstream itself offers.
  Each edit is marked `# VANTRY:` in place. A `CONFLICTS.md` was added beside them. **No other line of any
  original body was changed.**
- **Trademarks** (§6): this licence grants no rights in Strix's marks. "Strix" does not appear in Vantry
  branding, and these files are not presented as endorsed by usestrix.
- **Audited before vendoring**, not after: `docs/engineering/tools/strix.md` records what the instructions
  execute, which hosts they reach, that none declares `allowed-tools`, and the two findings that shaped the
  integration contract.
- **Not auto-invoked:** `vendor/` is not mirrored into `.claude/skills/`. Their trigger phrasing would
  out-match this repo's own `security-review` and `vulnerability-scan`, and a request for the gate must never
  become a request to run an autonomous exploitation tool. See `vendor/skills/strix/CONFLICTS.md`.

---

## `vendor/skills/frontend-design`

- **Source:** [`anthropics/skills`](https://github.com/anthropics/skills), path `skills/frontend-design`
- **Licence:** Apache License 2.0 — full text at `vendor/skills/frontend-design/LICENSE.txt`
- **Copyright:** © Anthropic PBC
- **Modifications** (Apache-2.0 §4(b)): the frontmatter `description` was rewritten to scope it to aesthetic
  direction and stop it competing with this project's `ui-component`; a deference header and a `CONFLICTS.md`
  were added beside it. **No line of the original body was changed.**
- **Trademarks** (§6): this licence grants no rights in Anthropic's marks. "Anthropic" and "Claude" do not
  appear in Vantry's branding, and must not.
- **Note:** the source repository carries no top-level LICENSE. The `LICENSE.txt` shipped *inside* the skill
  directory is the governing grant, which is why it is vendored verbatim alongside the text.

## `vendor/skills/supabase-postgres`

- **Source:** [`supabase/agent-skills`](https://github.com/supabase/agent-skills), path
  `skills/supabase-postgres-best-practices`
- **Licence:** MIT — full text at `vendor/skills/supabase-postgres/LICENSE`
- **Copyright:** © Supabase
- **Modifications:** the frontmatter `description` was narrowed to the performance lane and the claim "and the
  tests that verify them" removed (the skill ships no tests); a deference header and a `CONFLICTS.md` were
  added. **No upstream rule file was edited** — the four corrections live beside them.

---

## Reviewed and NOT included

Recorded because a rejection nobody wrote down gets proposed again. Neither author is hostile; both projects
are well built. They were refused on **shape**, not on trust.

| candidate | why not |
|---|---|
| [`vercel-labs/agent-browser`](https://github.com/vercel-labs/agent-browser) | Its frontmatter pre-grants `Bash(agent-browser:*)`. That wildcard covers `plugin add`, which spawns `npx -y <spec>` **at add time** — arbitrary, network-resolved code behind a command the permission system waves through. It also defers its real instructions to `agent-browser skills get core`, a corpus that is not in the file you review and changes per release. |
| [`vercel-labs/skills` → `find-skills`](https://github.com/vercel-labs/skills) | A package manager for *instructions* whose stated vetting is install count and GitHub stars, and which never tells the agent to read what it is about to install. Its recommended `-g` writes third-party instructions to the home directory — outside git, outside the diff, outside CI, and incapable of producing a receipt. |
| [`vercel-labs/agent-skills` → `react-best-practices`](https://github.com/vercel-labs/agent-skills) | **No LICENSE file exists anywhere in that repository** — not at the root, not in the skill directory. The `license: MIT` is a bare frontmatter string with no notice text behind it, so the default position is all rights reserved. Good content; not redistributable inside a template other people clone until upstream ships a real licence. |
| [`nextlevelbuilder/ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT and mechanically inert, but it needs Python 3 while `vantry.yml` declares `stack: POSIX shell + git + markdown — no runtime dependency beyond bash and git`, and 56 of its 192 palettes emit button-text pairs measured at 3.2–3.8:1 against this project's 4.5:1 AA floor. Reconsider if the stack constraint changes and the sub-AA rows are annotated. |
