#!/usr/bin/env bash
# Regression tests for the v1.0.1 hotfix. Each test asserts a REAL observable
# outcome; a failure prints what it saw.
#   bash scripts/test/test-install-safety.sh [kit-path]   # default: this repo
#
# The path used to be mandatory and the usage line named a file that no longer
# exists, so invoking it the obvious way failed with a message pointing at the
# wrong script. Default it to the repo this file lives in.
set -uo pipefail
KIT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
KIT="$(cd "$KIT" && pwd)"
WORK="$(mktemp -d)"
# Removed on every exit, not only after the last test: an interrupted run used to
# leave its copies of the kit in the temp directory (#4).
trap 'rm -rf "$WORK"' EXIT; trap 'exit 130' INT; trap 'exit 143' TERM
# kit_copy <src> <dst>: what the kit SHIPS — tracked files plus untracked files
# that are not ignored. `cp -R` copied everything, so a local git-ignored secret
# (skills/.env) landed in four temp directories on every verification (#4).
# Outside a git checkout there is no ignore list to ask; secrets are then
# dropped by name, the same rule sync-adapters.sh applies.
kit_copy() {
  mkdir -p "$2"
  if git -C "$1" rev-parse --git-dir >/dev/null 2>&1; then
    ( cd "$1" && git ls-files -co --exclude-standard -z \
        | while IFS= read -r -d '' f; do
            { [ -e "$f" ] || [ -L "$f" ]; } && printf '%s\0' "$f"
          done \
        | tar --null -T - -cf - ) | tar -xf - -C "$2"
  else
    cp -R "$1/." "$2/"
    find "$2" \( -name .env -o -name '.env.*' \) ! -name .env.example -exec rm -f {} + 2>/dev/null
  fi
}
G() { d="$1"; shift; git -C "$d" "$@"; }   # git in a named repo, without cd
PASS=0; FAIL=0
ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ✗ $1"; echo "      saw: $2"; FAIL=$((FAIL+1)); }

echo "=============================================================="
echo " T1 — install.sh must NOT disable existing git hooks"
echo "=============================================================="
P="$WORK/p1"; mkdir -p "$P"; git -C "$P" init -q
cat > "$P/.git/hooks/pre-commit" <<'H'
#!/bin/sh
echo "PROJECT-HOOK-RAN"
H
chmod +x "$P/.git/hooks/pre-commit"
OUT="$(DRY_RUN=0 "$KIT/scripts/adopt/install.sh" "$P" 2>&1)"
HP="$(git -C "$P" config --local --get core.hooksPath 2>/dev/null)"
[ -z "$HP" ] && ok "core.hooksPath left unset (was: '${HP:-<unset>}')" \
             || bad "core.hooksPath was set — hooks disabled" "core.hooksPath=$HP"
echo "x" > "$P/f.txt"; git -C "$P" add f.txt >/dev/null 2>&1
CM="$(git -C "$P" -c user.email=t@t -c user.name=t commit -m t 2>&1)"
case "$CM" in *PROJECT-HOOK-RAN*) ok "the project's own pre-commit still fires" ;;
              *) bad "the project's pre-commit no longer fires" "$CM" ;; esac
# Reachability, not a marker: the marker was present in the version where the
# stage was dead code below the user's `exit 0`.
PROBE="$( cd "$P" && VANTRY_HOOK_PROBE=1 .git/hooks/pre-commit /dev/null </dev/null 2>&1 )"
case "$PROBE" in
  *VANTRY_HOOK_REACHED*) ok "the probe REACHES vantry's stage through the project's own hook" ;;
  *) bad "vantry's stage is unreachable behind the existing hook" "$PROBE" ;;
esac

echo
echo "=============================================================="
echo " T1b — install.sh installs the UNIVERSAL kit, not just .claude/"
echo "=============================================================="
for f in AGENTS.md agents/security-engineer.md skills/verify-change/SKILL.md \
         scripts/verify.sh scripts/lib/vantry-common.sh .githooks/pre-push \
         vantry.yml.example .claude/settings.json; do
  [ -e "$P/$f" ] && ok "installed $f" || bad "MISSING $f — the kit is not portable" "$(ls "$P")"
done
for f in CLAUDE.md GEMINI.md .cursor/rules/agent-native.mdc .windsurf/rules/agent-native.md; do
  [ -e "$P/$f" ] && ok "adapter generated: $f" || bad "adapter missing: $f" ""
done
[ -d "$P/.claude/skills/verify-change" ] && ok "the Claude mirror was built in the target" || bad "no mirror" "$(ls "$P/.claude" 2>&1)"
[ -f "$P/.vantry/manifest.json" ] && ok "provenance manifest written" || bad "no manifest" ""
grep -q '"kit_version"' "$P/.vantry/manifest.json" 2>/dev/null && ok "manifest records the kit version" || bad "manifest incomplete" ""

echo
echo "=============================================================="
echo " T1c — an installed repo is NOT stale the instant it verifies"
echo "=============================================================="
# The worst bug this kit has shipped. .vantry/ held the receipt AND was untracked
# in the target (install.sh never touched its .gitignore), so the receipt was
# part of the digest it certified: verified, then instantly STALE and BLOCKED,
# forever, in every adopted repo. The kit tested green on itself only because
# its own .gitignore hides .vantry/. Correctness may not depend on a file the
# user owns, so the exclusion is now in vantry_changed_files itself.
SP="$WORK/stale"; mkdir -p "$SP/src"; ( cd "$SP" && git init -q -b main )
printf 'console.log("hi");\n' > "$SP/src/app.js"
printf '#!/usr/bin/env bash\ngrep -q hi src/app.js && echo "smoke ok"\n' > "$SP/smoke.sh"
chmod +x "$SP/smoke.sh"
( cd "$SP" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm init )
"$KIT/scripts/adopt/install.sh" "$SP" >/dev/null 2>&1
cat > "$SP/vantry.yml" <<'Y'
version: 2
stack: "plain JS"
project_type: service
strictness: standard
run:
  test: "true"
  smoke: bash smoke.sh
gates:
  verify_change: block
merge:
  base: main
trivial_paths:
  - "*.md"
sensitive_paths:
  - "**/auth/**"
Y
# Keep the run's own output: when this fails, "gate blocks on a clean verified
# tree" is a symptom, and the cause is whichever STEP failed. A test that fails
# without showing why costs a CI round-trip per guess — which is exactly what it
# cost, twice.
VOUT="$( cd "$SP" && ./scripts/verify.sh 2>&1 )"
ST="$( cd "$SP" && ./scripts/verify.sh --status 2>&1 )"
case "$VOUT" in
  *"✓ VERIFIED"*) ok "the installed repo verifies" ;;
  *) bad "the installed repo does NOT verify" "$VOUT" ;;
esac
case "$ST" in
  *"freshness  : CURRENT"*) ok "the receipt is CURRENT immediately after a pass" ;;
  *) bad "the receipt is stale the moment it is written" "$ST" ;;
esac
RC=$( ( cd "$SP" && ./scripts/verify.sh --gate --stop ) >/dev/null 2>&1; echo $? )
[ "$RC" = "0" ] && ok "the gate does not block a freshly verified clean tree" || bad "gate blocks on a clean verified tree (rc=$RC)" "$ST
--- the verify run that produced that receipt ---
$VOUT"
grep -q '^\.vantry/receipts/' "$SP/.gitignore" 2>/dev/null \
  && ok "install.sh appended the evidence paths to the target .gitignore" \
  || bad "the target .gitignore does not ignore .vantry evidence" "$(cat "$SP/.gitignore" 2>&1)"
V="$( cd "$SP" && ./scripts/verify.sh --status 2>&1 | sed -n '1s/^vantry \([^ ]*\) .*/\1/p' )"
if [ -n "$V" ] && [ "$V" != "unknown" ] && [ "$V" = "$(cat "$KIT/VERSION")" ]; then
  ok "the installed kit reports its real version ($V)"
else
  bad "version reported as '${V:-<empty>}', expected $(cat "$KIT/VERSION")" ""
fi

echo
echo "=============================================================="
echo " T2 — install.sh must NOT replace a live issues.csv"
echo "=============================================================="
P="$WORK/p2"; mkdir -p "$P/scripts/kanban"; git -C "$P" init -q
printf 'id,title\nPRJ-001,my real backlog item\n' > "$P/scripts/kanban/issues.csv"
BEFORE="$(shasum "$P/scripts/kanban/issues.csv" | cut -d' ' -f1)"
"$KIT/scripts/adopt/install.sh" "$P" >/dev/null 2>&1
AFTER="$(shasum "$P/scripts/kanban/issues.csv" | cut -d' ' -f1)"
[ "$BEFORE" = "$AFTER" ] && ok "live issues.csv byte-identical after install" \
                         || bad "live issues.csv was replaced" "$(cat "$P/scripts/kanban/issues.csv")"
[ -f "$P/scripts/kanban/import-kanban.sh" ] && ok "kit files still installed alongside it" \
                                            || bad "kit files missing" "$(ls "$P/scripts/kanban")"

echo
echo "=============================================================="
echo " T3 — install.sh is idempotent (2 runs, no data churn)"
echo "=============================================================="
"$KIT/scripts/adopt/install.sh" "$P" >/dev/null 2>&1
A2="$(shasum "$P/scripts/kanban/issues.csv" | cut -d' ' -f1)"
[ "$BEFORE" = "$A2" ] && ok "issues.csv still untouched on the 2nd run" || bad "2nd run changed it" "$A2"
N="$(find "$P" -name '*.vantry-bak-*' | wc -l | tr -d ' ')"
[ "$N" = "0" ] && ok "no spurious backups on an identical 2nd run" || bad "$N backup file(s) created" "$(find "$P" -name '*.vantry-bak-*')"

echo
echo "=============================================================="
echo " T4 — install.sh must NOT clobber a project's .claude/settings.json"
echo "=============================================================="
P="$WORK/p4"; mkdir -p "$P/.claude"; git -C "$P" init -q
printf '{"permissions":{"allow":["Bash(mine)"]}}\n' > "$P/.claude/settings.json"
"$KIT/scripts/adopt/install.sh" "$P" >/dev/null 2>&1
# The contract changed in v3.17.0, and it is worth stating precisely: this file
# is never OVERWRITTEN, but it is MERGED. Asserting byte-equality was asserting
# that the kit's hooks are never registered — which is exactly the defect that
# left the Stop gate inert on every brownfield repo that already had one.
grep -q 'Bash(mine)' "$P/.claude/settings.json" \
  && ok "the user's own settings survive the install" \
  || bad "the install destroyed settings the user had written" "$(cat "$P/.claude/settings.json")"
grep -q 'verify-gate' "$P/.claude/settings.json" \
  && ok "…and the kit's hooks are actually registered, not just copied" \
  || bad "hook scripts installed but never registered — the gate is inert" "$(cat "$P/.claude/settings.json")"
[ -d "$P/.claude/agents" ] && ok "kit agents installed next to it" || bad "kit agents missing" "$(ls "$P/.claude")"

echo
echo "=============================================================="
echo " T5 — sync-adapters.sh must NOT destroy a project CLAUDE.md"
echo "=============================================================="
P="$WORK/p5"; kit_copy "$KIT" "$P"
cat > "$P/CLAUDE.md" <<'C'
# Acme Platform — CLAUDE.md
Generated by /bootstrap. Stack: Next.js 15 + Postgres.
## Commands
- install: pnpm i
- test: pnpm vitest run
## Domain rules
Money is stored in integer minor units. Orders are immutable once paid.
## No-go zones
Never touch billing/reconcile.ts without payments-engineer sign-off.
This is 200 lines of real project knowledge in the real thing.
C
"$P/scripts/sync-adapters.sh" >/dev/null 2>&1
grep -q "Acme Platform" "$P/CLAUDE.md" && ok "project content survived the sync" \
  || bad "project CLAUDE.md was destroyed" "$(cat "$P/CLAUDE.md")"
grep -q "vantry:adapter:start" "$P/CLAUDE.md" && ok "generated block was added with markers" \
  || bad "no marker block" "$(head -3 "$P/CLAUDE.md")"
ls "$P"/CLAUDE.md.vantry-bak-* >/dev/null 2>&1 && ok "a timestamped backup was written" || bad "no backup" "$(ls "$P")"

echo "  -- 2nd sync (splice, must not duplicate) --"
"$P/scripts/sync-adapters.sh" >/dev/null 2>&1
NB="$(grep -c "vantry:adapter:start" "$P/CLAUDE.md")"
[ "$NB" = "1" ] && ok "still exactly 1 generated block after re-sync" || bad "block duplicated" "count=$NB"
grep -q "Acme Platform" "$P/CLAUDE.md" && ok "project content still there after re-sync" || bad "lost on 2nd sync" "$(cat "$P/CLAUDE.md")"

echo
echo "=============================================================="
echo " T6 — sync-adapters.sh must NOT rm -rf a project-local skill"
echo "=============================================================="
P="$WORK/p6"; kit_copy "$KIT" "$P"
mkdir -p "$P/.claude/skills/acme-deploy"
echo "# our own deploy playbook" > "$P/.claude/skills/acme-deploy/SKILL.md"
OUT="$("$P/scripts/sync-adapters.sh" 2>&1)"; RC=$?
[ -f "$P/.claude/skills/acme-deploy/SKILL.md" ] && ok "project-local skill still exists" \
  || bad "project-local skill was deleted" "rc=$RC"
[ "$RC" != "0" ] && ok "sync exits non-zero on orphans (rc=$RC)" || bad "sync exited 0 despite orphans" "rc=$RC"
case "$OUT" in *acme-deploy*) ok "the orphan is named in the output" ;;
              *) bad "orphan not named" "$OUT" ;; esac
OUT2="$("$P/scripts/sync-adapters.sh" --force 2>&1)"; RC2=$?
[ ! -f "$P/.claude/skills/acme-deploy/SKILL.md" ] && ok "--force does delete it (explicit opt-in)" \
  || bad "--force did not delete" "rc=$RC2"
[ "$RC2" = "0" ] && ok "--force exits 0" || bad "--force exited $RC2" "$OUT2"

echo
echo "=============================================================="
echo " T7 — sync-adapters.sh still produces a correct mirror"
echo "=============================================================="
P="$WORK/p7"; kit_copy "$KIT" "$P"; rm -rf "$P/.claude/agents" "$P/.claude/skills"
"$P/scripts/sync-adapters.sh" >/dev/null 2>&1
if diff -rq "$P/agents" "$P/.claude/agents" >/dev/null 2>&1 && diff -rq "$P/skills" "$P/.claude/skills" >/dev/null 2>&1; then
  ok "mirror rebuilt from scratch and matches source exactly"
else
  bad "mirror does not match source" "$(diff -rq "$P/agents" "$P/.claude/agents" 2>&1 | head -3)"
fi
echo "  -- a git-ignored file in skills/ is never mirrored, and is not drift --"
P7B="$WORK/p7b"; kit_copy "$KIT" "$P7B"; git -C "$P7B" init -q >/dev/null 2>&1
printf 'TOKEN=not-a-real-secret\n' > "$P7B/skills/.env"
mkdir -p "$P7B/skills/zz-new"; printf '# a skill not committed yet\n' > "$P7B/skills/zz-new/SKILL.md"
"$P7B/scripts/sync-adapters.sh" --force >/dev/null 2>&1
[ ! -e "$P7B/.claude/skills/.env" ] && ok "an ignored skills/.env is not copied into .claude/skills" \
  || bad "the mirror copied an ignored file" "$(ls -a "$P7B/.claude/skills" | head -5)"
[ -f "$P7B/.claude/skills/zz-new/SKILL.md" ] && ok "an untracked, not-ignored skill is still mirrored" \
  || bad "a new skill was not mirrored" ""
OUTC="$("$P7B/scripts/sync-adapters.sh" --check 2>&1)" && ok "--check does not report an ignored file as drift" \
  || bad "--check reports drift" "$OUTC"
printf 'changed\n' >> "$P7B/skills/zz-new/SKILL.md"
"$P7B/scripts/sync-adapters.sh" --check >/dev/null 2>&1 && bad "--check missed a change to an untracked skill" "" \
  || ok "--check still sees a change to an untracked skill"
echo "  -- #7: the ignore filter must fail closed, and an old copy must go --"
# Not a repository: no ignore list exists, so the secret is dropped by name.
P7C="$WORK/p7c"; kit_copy "$KIT" "$P7C"; rm -rf "$P7C/.claude/skills"
printf 'TOKEN=not-a-real-secret\n' > "$P7C/skills/.env"
printf 'TOKEN=\n' > "$P7C/skills/.env.example"
"$P7C/scripts/sync-adapters.sh" --force >/dev/null 2>&1
[ ! -e "$P7C/.claude/skills/.env" ] && ok "outside a git checkout, skills/.env is still not mirrored" \
  || bad "a non-repo copy mirrored skills/.env" "$(ls -a "$P7C/.claude/skills" | head -5)"
[ -f "$P7C/.claude/skills/.env.example" ] && ok "skills/.env.example is mirrored (a template, not a secret)" \
  || bad ".env.example was dropped" ""
# A checkout git cannot read: refuse, never mirror everything.
P7D="$WORK/p7d"; kit_copy "$KIT" "$P7D"; rm -rf "$P7D/.claude/skills"
printf 'gitdir: %s/nowhere\n' "$WORK" > "$P7D/.git"
printf 'TOKEN=not-a-real-secret\n' > "$P7D/skills/.env"
OUTD="$("$P7D/scripts/sync-adapters.sh" --force 2>&1)"; RCD=$?
[ "$RCD" != "0" ] && ok "a checkout git cannot read makes sync refuse (rc=$RCD)" \
  || bad "sync exited 0 on an unreadable checkout" "$OUTD"
[ ! -e "$P7D/.claude/skills/.env" ] && ok "and nothing secret was mirrored" \
  || bad "an unreadable checkout mirrored skills/.env" ""
# A nested repository under skills/ answers for itself; the name rule still holds.
mkdir -p "$P7B/skills/zz-nested"; git -C "$P7B/skills/zz-nested" init -q >/dev/null 2>&1
printf 'TOKEN=not-a-real-secret\n' > "$P7B/skills/zz-nested/.env"
"$P7B/scripts/sync-adapters.sh" --force >/dev/null 2>&1
[ ! -e "$P7B/.claude/skills/zz-nested/.env" ] && ok "a .env inside a nested repository is not mirrored" \
  || bad "a nested repository's .env was mirrored" ""
# Its own ignore rules count too: the outer git never reads them.
mkdir -p "$P7B/skills/zz-nested/.git/info"; printf 'creds.json\n' >> "$P7B/skills/zz-nested/.git/info/exclude"
printf '{"k":"not-a-real-secret"}\n' > "$P7B/skills/zz-nested/creds.json"
printf '# a skill kept in its own repository\n' > "$P7B/skills/zz-nested/SKILL.md"
"$P7B/scripts/sync-adapters.sh" --force >/dev/null 2>&1
[ ! -e "$P7B/.claude/skills/zz-nested/creds.json" ] && ok "a file the nested repository ignores is not mirrored" \
  || bad "a file excluded by the nested repository was mirrored" ""
[ -f "$P7B/.claude/skills/zz-nested/SKILL.md" ] && [ ! -e "$P7B/.claude/skills/zz-nested/.git" ] \
  && ok "the nested skill itself is mirrored, its .git is not" \
  || bad "the nested skill was dropped, or its .git copied" "$(ls -a "$P7B/.claude/skills/zz-nested" 2>&1 | head -5)"
"$P7B/scripts/sync-adapters.sh" --check >/dev/null 2>&1 && ok "--check: the nested repository's ignored file is not drift" \
  || bad "--check reports the nested ignored file" "$("$P7B/scripts/sync-adapters.sh" --check 2>&1 | head -3)"
mkdir -p "$P7B/skills/zz-broken"; printf 'gitdir: %s/nowhere\n' "$WORK" > "$P7B/skills/zz-broken/.git"
printf 'TOKEN=not-a-real-secret\n' > "$P7B/skills/zz-broken/creds.txt"
OUTN="$("$P7B/scripts/sync-adapters.sh" --force 2>&1)"; RCN=$?
[ "$RCN" != "0" ] && [ ! -e "$P7B/.claude/skills/zz-broken/creds.txt" ] \
  && ok "a nested repository git cannot read makes sync refuse (rc=$RCN), nothing copied" \
  || bad "an unreadable nested repository was mirrored" "rc=$RCN $OUTN"
rm -rf "$P7B/skills/zz-nested" "$P7B/.claude/skills/zz-nested" "$P7B/skills/zz-broken" "$P7B/.claude/skills/zz-broken"
# Outside any checkout, a nested repository still answers for itself.
mkdir -p "$P7C/skills/zz-nested"; git -C "$P7C/skills/zz-nested" init -q >/dev/null 2>&1
mkdir -p "$P7C/skills/zz-nested/.git/info"; printf 'creds.json\n' >> "$P7C/skills/zz-nested/.git/info/exclude"
printf '{"k":"not-a-real-secret"}\n' > "$P7C/skills/zz-nested/creds.json"
"$P7C/scripts/sync-adapters.sh" --force >/dev/null 2>&1
[ ! -e "$P7C/.claude/skills/zz-nested/creds.json" ] && ok "outside a checkout, a nested repository's ignored file is not mirrored" \
  || bad "a non-repo copy mirrored a nested repository's ignored file" ""
rm -rf "$P7C/skills/zz-nested" "$P7C/.claude/skills/zz-nested"
# A copy an older sync already made is named, removed by --force, then clean.
printf 'TOKEN=old-copy\n' > "$P7B/.claude/skills/.env"
OUTE="$("$P7B/scripts/sync-adapters.sh" 2>&1)"; RCE=$?
{ [ "$RCE" != "0" ] && case "$OUTE" in *.env*) true ;; *) false ;; esac; } \
  && ok "an old mirrored .env is named and the sync refuses (rc=$RCE)" \
  || bad "an old mirrored .env was kept silently" "rc=$RCE $OUTE"
"$P7B/scripts/sync-adapters.sh" --force >/dev/null 2>&1
[ ! -e "$P7B/.claude/skills/.env" ] && ok "--force removes the old copy" || bad "--force kept the old copy" ""
"$P7B/scripts/sync-adapters.sh" --check >/dev/null 2>&1 && ok "--check is clean afterwards" \
  || bad "--check still reports drift" "$("$P7B/scripts/sync-adapters.sh" --check 2>&1 | head -3)"
echo "  -- deleting a source skill must be reported, not silently kept --"
rm -rf "$P/skills/standup"
OUT="$("$P/scripts/sync-adapters.sh" 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "sync refuses while the mirror holds a deleted skill (rc=$RC)" || bad "silently kept it" "rc=$RC"
"$P/scripts/sync-adapters.sh" --force >/dev/null 2>&1
[ ! -d "$P/.claude/skills/standup" ] && ok "--force reaps the deleted skill" || bad "still mirrored" "$(ls "$P/.claude/skills" | head)"

echo
echo "=============================================================="
echo " T9 — the installer must not RUN the commands it describes"
echo "=============================================================="
# Its closing message was an UNQUOTED heredoc containing an example command in
# backticks. Command substitution executed it, so a "non-destructive" installer
# created ./my-project/ and ran git init inside the user's repository.
HP="$WORK/heredoc"; mkdir -p "$HP"; ( cd "$HP" && git init -q -b main . )
printf 'x\n' > "$HP/app.js"
( cd "$HP" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm i >/dev/null )
BEFORE="$(cd "$HP" && ls -A | LC_ALL=C sort | tr '\n' ' ')"
"$KIT/scripts/adopt/install.sh" "$HP" >/dev/null 2>&1
[ -d "$HP/my-project" ] \
  && bad "the installer executed an example from its own help text — ./my-project/ was created" "" \
  || ok "the closing message is inert text, not a command substitution"
# and nothing else appeared beyond what the installer legitimately writes
UNEXPECTED="$(cd "$HP" && ls -A | LC_ALL=C sort | tr '\n' ' ')"
case "$UNEXPECTED" in
  *my-project*) bad "unexpected directory in the target" "$UNEXPECTED" ;;
  *) ok "the target gained only files the installer declares (was: $BEFORE)" ;;
esac
# The general rule, so the next one is caught by a test and not by an audit.
# Narrow deliberately: a heredoc feeding a LOOP (`done <<EOF` … `$(cmd)` … EOF)
# is the standard idiom and its substitution is the point. The dangerous shape is
# a heredoc that PRINTS to the user — prose describing a command — because there
# the substitution is an accident. So: only `cat <<TAG` unquoted, containing a
# backtick or $(.
BADHD=""
for f in "$KIT"/scripts/adopt/*.sh "$KIT"/scripts/*.sh "$KIT"/scripts/lib/*.sh "$KIT"/.githooks/*; do
  [ -f "$f" ] || continue
  if ! awk '
    /^[[:space:]]*cat[[:space:]]+<<[[:space:]]*[A-Za-z_]/ && !/<<[[:space:]]*'"'"'/ && !/<<-?[[:space:]]*"/ {
      inhd=1; tag=$0; sub(/.*<<-?[[:space:]]*/,"",tag); next }
    inhd && $0 ~ "^[[:space:]]*" tag "[[:space:]]*$" { inhd=0; next }
    inhd && (/`/ || /\$\(/) { found=1 }
    END { exit(found?1:0) }
  ' "$f" 2>/dev/null; then
    BADHD="$BADHD $(basename "$f")"
  fi
done
[ -z "$BADHD" ] && ok "no user-facing heredoc executes the commands it describes" \
  || bad "unquoted cat-heredoc(s) carrying a command substitution:$BADHD" ""

echo
echo "=============================================================="
echo " T10 — an adopter receives EVERY line of distribution.txt"
echo "=============================================================="
# The installer used to carry its own hardcoded list, and the list drifted:
# evidence.yml shipped as a feature in v3.13.0 and was never added, so for two
# versions every adopter's PR evidence gate silently did not exist. Same for
# vendor/, THIRD_PARTY_NOTICES.md, docs/engineering/ and the evals.
DP="$WORK/dist"; mkdir -p "$DP"; ( cd "$DP" && git init -q -b main . )
printf 'x\n' > "$DP/app.js"
( cd "$DP" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm i >/dev/null )
"$KIT/scripts/adopt/install.sh" "$DP" >/dev/null 2>&1

MISSING=""
while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; esac
  opt=0
  case "$line" in '?'*) opt=1; line="${line#\?}" ;; esac
  [ -e "$KIT/$line" ] || { [ "$opt" -eq 1 ] && continue; MISSING="$MISSING $line(absent-upstream)"; continue; }
  [ -e "$DP/$line" ] || MISSING="$MISSING $line"
done < "$KIT/distribution.txt"
[ -z "$MISSING" ] && ok "every path in distribution.txt arrived in the target" \
  || bad "the installer did not deliver:$MISSING" ""

# and the capabilities the README advertises are reachable, not just present
for cap in ".github/workflows/verify.yml:the CI contract" \
           ".github/workflows/evidence.yml:the PR evidence gate" \
           "scripts/verify.sh:the verification gate" \
           "scripts/check-vendored.sh:the vendored-instruction gate" \
           "scripts/check-protection.sh:the branch-protection report" \
           "AGENTS.md:the working agreement" \
           ".githooks/pre-push:the universal push gate"; do
  f="${cap%%:*}"; label="${cap#*:}"
  [ -e "$DP/$f" ] || bad "$label is advertised and was not installed ($f)" ""
done
ok "every advertised capability is present in a fresh install"

# the manifest must not list something the kit does not have — a promise with
# nothing behind it fails here rather than at an adopter's first run
GHOST=""
while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; esac
  case "$line" in '?'*) continue ;; esac
  [ -e "$KIT/$line" ] || GHOST="$GHOST $line"
done < "$KIT/distribution.txt"
[ -z "$GHOST" ] && ok "distribution.txt lists nothing this kit does not have" \
  || bad "distribution.txt promises paths that do not exist:$GHOST" ""

echo
echo "=============================================================="
echo " T11 — an existing .claude/settings.json is merged, not skipped"
echo "=============================================================="
# It was treated as project data and preserved WHOLE — which is right for the
# file, and wrong for the outcome: the hook scripts were copied and never
# REGISTERED, so on any repo that already had settings.json the Stop gate and
# the bash guard did not run while the README said they did.
SP2="$WORK/settings"; mkdir -p "$SP2/.claude"; ( cd "$SP2" && git init -q -b main . )
cat > "$SP2/.claude/settings.json" <<'JSON11'
{ "permissions": { "allow": ["Bash(npm test:*)"] },
  "hooks": { "PreToolUse": [ { "matcher": "Write",
    "hooks": [ { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/my-own-guard.sh" } ] } ] } }
JSON11
printf 'x\n' > "$SP2/app.js"
( cd "$SP2" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm "feat: app" >/dev/null )
"$KIT/scripts/adopt/install.sh" "$SP2" >/dev/null 2>&1

while IFS= read -r line; do
  case "$line" in
    OK*) ok "${line#OK }" ;;
    NO*) bad "${line#NO }" "$(cat "$SP2/.claude/settings.json")" ;;
  esac
done <<EOF
$(python3 - "$SP2/.claude/settings.json" <<'PY11B'
import json, sys
d = json.load(open(sys.argv[1]))
cmds = [h["command"] for e in d.get("hooks", {}).values() for entry in e for h in entry.get("hooks", [])]
allow = d.get("permissions", {}).get("allow", [])
for k, v in {
  "an existing settings.json keeps the user's own hook": any("my-own-guard" in c for c in cmds),
  "…and the user's own permissions": "Bash(npm test:*)" in allow,
  "…while the Stop gate gets registered": any("verify-gate" in c for c in cmds),
  "…and so does the bash guard": any("bash-guard" in c for c in cmds),
}.items():
    print(("OK " if v else "NO ") + k)
PY11B
)
EOF

# merging twice must change nothing — an installer people re-run is an installer
BEFORE11="$(shasum -a 256 "$SP2/.claude/settings.json" | cut -d' ' -f1)"
python3 "$KIT/scripts/lib/merge-claude-settings.py" "$KIT/.claude/settings.json" "$SP2/.claude/settings.json" >/dev/null 2>&1
AFTER11="$(shasum -a 256 "$SP2/.claude/settings.json" | cut -d' ' -f1)"
[ "$BEFORE11" = "$AFTER11" ] && ok "merging twice is a no-op" || bad "the merge is not idempotent" ""

echo
echo "=============================================================="
echo " T12 — the vulnerability scanner tells the truth in both directions"
echo "=============================================================="
# The kit had a security-review playbook and a secret scan and NOTHING that
# asked whether the project depends on something with a published CVE. The two
# properties that matter: it finds real ones on any stack, and it never reports
# a scan that could not run as clean.
VP="$WORK/vulns"; mkdir -p "$VP/scripts/lib"
( cd "$VP" && git init -q -b main . )
cp "$KIT/scripts/scan-vulns.sh" "$VP/scripts/"
cp "$KIT"/scripts/lib/*.sh "$KIT"/scripts/lib/*.py "$VP/scripts/lib/"
chmod +x "$VP/scripts/scan-vulns.sh"
printf 'version: 2\nstack: "mixed"\nproject_type: service\nstrictness: standard\nrun:\n  test: "true"\n  smoke: "true"\nmerge:\n  base: main\n' > "$VP/vantry.yml"

# an ecosystem most vendor scanners cover poorly, to prove the "any stack" claim
printf '%%{\n  "plug": {:hex, :plug, "1.3.0", "abc", [:mix], [], "hexpm"},\n}\n' > "$VP/mix.lock"
OUT12="$( cd "$VP" && bash scripts/scan-vulns.sh 2>&1 )"
case "$OUT12" in
  *"Hex/plug"*) ok "it finds a known CVE in an Elixir/Hex lockfile (no vendor account involved)" ;;
  *"could not reach"*|*"NOTHING RAN"*) ok "(offline — scanner correctly reports it could not check)" ;;
  *) bad "an Elixir lockfile with a known-vulnerable plug scanned clean" "$OUT12" ;;
esac
rm -f "$VP/mix.lock"

# and a clean lockfile must NOT produce noise — a scanner that cries wolf is off by Friday
printf '{ "name":"t","lockfileVersion":3,\n  "packages": { "node_modules/ms": { "name":"ms", "version":"2.1.3" } } }\n' > "$VP/package-lock.json"
if ( cd "$VP" && bash scripts/scan-vulns.sh ) >/dev/null 2>&1; then
  ok "a dependency with no known CVE scans clean"
else
  OUT12B="$( cd "$VP" && bash scripts/scan-vulns.sh 2>&1 )"
  case "$OUT12B" in
    *"could not reach"*|*"NOTHING RAN"*) ok "(offline — no false clean, no false alarm)" ;;
    *) bad "false positive on a clean dependency" "$OUT12B" ;;
  esac
fi

# the property the whole playbook rests on: incomplete is not clean
OUT12C="$( cd "$VP" && PATH=/usr/bin:/bin bash scripts/scan-vulns.sh 2>&1 )"
case "$OUT12C" in
  *"NOTHING RAN"*|*"not a clean scan"*|*"INCOMPLETE"*|*"could not reach"*)
    ok "with no scanner and no python3 it says so instead of reporting clean" ;;
  *)
    # python3 may still be at /usr/bin — then it genuinely scanned
    case "$OUT12C" in
      *"OSV.dev"*) ok "python3 was still present, so it scanned for real" ;;
      *) bad "a scan that could not run did not say so" "$OUT12C" ;;
    esac ;;
esac

# --introduced must not punish someone for a dependency they did not touch
( cd "$VP" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm "feat: base" >/dev/null )
( cd "$VP" && git checkout -qb feat/docs && printf 'x\n' > README.md )
( cd "$VP" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm "docs: readme" >/dev/null )
if ( cd "$VP" && bash scripts/scan-vulns.sh --introduced ) >/dev/null 2>&1; then
  ok "a branch touching no lockfile introduces nothing and is not blocked"
else
  bad "a PR was blocked for a vulnerability it did not introduce" "$( cd "$VP" && bash scripts/scan-vulns.sh --introduced 2>&1 | tail -5 )"
fi

echo
echo "=============================================================="
echo " T13 — the code-quality scan catches, and does not cry wolf"
echo "=============================================================="
QP="$WORK/quality"; mkdir -p "$QP/scripts/lib" "$QP/src"
( cd "$QP" && git init -q -b main . )
cp "$KIT/scripts/scan-quality.sh" "$QP/scripts/"; cp "$KIT"/scripts/lib/*.sh "$QP/scripts/lib/"
chmod +x "$QP/scripts/scan-quality.sh"
printf 'version: 2\nstack: "mixed"\nproject_type: service\nstrictness: standard\nrun:\n  test: "true"\n  smoke: "true"\nmerge:\n  base: main\n' > "$QP/vantry.yml"

# five real defects, five languages — the point of a cross-language floor
printf 'const r = await fetch(u, { agent: new https.Agent({ rejectUnauthorized: false }) })\n' > "$QP/src/api.js"
# a heredoc, not printf: the fixture line is full of % and printf reads those
cat > "$QP/src/db.py" <<'PYFIX'
cur.execute("SELECT * FROM orders WHERE id = %s" % request.args.get("id"))
PYFIX
printf 'system("convert #{params[:file]} out.png")\n' > "$QP/src/run.rb"
printf 'fmt.Printf("user %%s token %%s", user, sessionToken)\n' > "$QP/src/log.go"
printf 'if (localStorage.getItem("isAdmin") === "true") { showAdminPanel() }\n' > "$QP/src/ui.ts"
( cd "$QP" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm "feat: five problems" >/dev/null )
OUT13="$( cd "$QP" && bash scripts/scan-quality.sh 2>&1 )"
for pat in "TLS verification disabled" "SQL" "eval / exec on request data" "a secret in a log line" "authorization decided on the client"; do
  case "$OUT13" in
    *"$pat"*) ok "catches: $pat" ;;
    *)        bad "missed: $pat" "$OUT13" ;;
  esac
done

# a false positive is why a scanner gets switched off — this one caught its own
# kanban importer on `--single-select-options` before word boundaries were added
rm -f "$QP"/src/*
printf 'export function add(a, b) { return a + b }\n' > "$QP/src/clean.js"
printf 'gh project field-create --single-select-options "$opts"\n' > "$QP/src/deploy.sh"
( cd "$QP" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm "refactor: clean" >/dev/null )
( cd "$QP" && bash scripts/scan-quality.sh ) >/dev/null 2>&1 \
  && ok "clean code produces nothing — including '--single-select-options'" \
  || bad "false positive on clean code" "$( cd "$QP" && bash scripts/scan-quality.sh 2>&1 | tail -12 )"

# and it must never print a green tick for a language it cannot read
case "$( cd "$QP" && bash scripts/scan-quality.sh 2>&1 )" in
  *"covers the analysers above and"*) ok "a clean result states what it actually covered" ;;
  *) bad "reported clean without saying what ran" "" ;;
esac

echo
echo "=============================================================="
echo " T14 — the installer ships the kit, not what the kit left lying around"
echo "=============================================================="
# Reported from real use: install.sh copied 64 .vantry-bak-* files from the
# source kit into the target. The walk was a bare `find`, and this kit WRITES
# artefacts into its own tree — install.sh, sync-adapters.sh and upgrade.sh all
# leave <name>.vantry-bak-<timestamp> behind. They are gitignored, so a fresh
# clone has none and no test noticed; a working copy that has been used has
# dozens.
BSRC="$WORK/bak-src"; BTGT="$WORK/bak-tgt"
mkdir -p "$BSRC"
# a source that looks like a kit someone has actually used
( cd "$KIT" && git ls-files ) | while IFS= read -r f; do
  mkdir -p "$BSRC/$(dirname "$f")"; cp "$KIT/$f" "$BSRC/$f" 2>/dev/null
done
( cd "$BSRC" && git init -q -b main . && git -c user.email=t@t -c user.name=t add -A >/dev/null \
  && git -c user.email=t@t -c user.name=t commit -qm "feat: the kit" >/dev/null )
for f in AGENTS.md README.md scripts/verify.sh; do
  [ -f "$BSRC/$f" ] && cp "$BSRC/$f" "$BSRC/$f.vantry-bak-20260101-120000"
done
mkdir -p "$BSRC/.vantry/receipts" "$BSRC/.vantry/state"
printf '{"verdict":"pass"}\n' > "$BSRC/.vantry/receipts/main.verify.json"
printf 'deadbeef\n'           > "$BSRC/.vantry/state/seal.key"
printf '755\n'                > "$BSRC/.githooks/pre-push.vantry-mode"
touch "$BSRC/skills/.DS_Store"

mkdir -p "$BTGT"; ( cd "$BTGT" && git init -q -b main . )
printf 'x\n' > "$BTGT/app.js"
( cd "$BTGT" && git -c user.email=t@t -c user.name=t add -A >/dev/null && git -c user.email=t@t -c user.name=t commit -qm "feat: app" >/dev/null )
"$BSRC/scripts/adopt/install.sh" "$BTGT" >/dev/null 2>&1

[ "$(find "$BTGT" -name '*.vantry-bak-*' 2>/dev/null | wc -l | tr -d ' ')" = "0" ] \
  && ok "no .vantry-bak-* file reached the target" \
  || bad "the installer shipped its own backup files" "$(find "$BTGT" -name '*.vantry-bak-*' | head -5)"
[ "$(find "$BTGT" -name '*.vantry-mode' 2>/dev/null | wc -l | tr -d ' ')" = "0" ] \
  && ok "…nor the hook mode records" || bad ".vantry-mode files shipped" ""
[ "$(find "$BTGT" -name '.DS_Store' 2>/dev/null | wc -l | tr -d ' ')" = "0" ] \
  && ok "…nor .DS_Store" || bad ".DS_Store shipped" ""
[ -f "$BTGT/.vantry/receipts/main.verify.json" ] \
  && bad "a receipt from the SOURCE machine was installed as evidence here" "" \
  || ok "…nor a receipt from another machine (that would be someone else's proof)"
[ -f "$BTGT/.vantry/state/seal.key" ] \
  && bad "the source machine's seal key was copied — every receipt it signs would verify" "" \
  || ok "…nor the seal key, which is a machine-local secret"

# and the kit itself still arrives in full
for f in AGENTS.md scripts/verify.sh .githooks/pre-push skills/next/SKILL.md \
         agents/debugger.md .github/workflows/verify.yml distribution.txt; do
  [ -e "$BTGT/$f" ] || bad "the exclusion swept away something real: $f is missing" ""
done
ok "and every advertised path still arrives ($(find "$BTGT" -type f -not -path '*/.git/*' | wc -l | tr -d ' ') files)"

# the non-git fallback must exclude the same things
BSRC2="$WORK/bak-src-nogit"; cp -R "$BSRC" "$BSRC2"; rm -rf "$BSRC2/.git"
BTGT2="$WORK/bak-tgt-nogit"; mkdir -p "$BTGT2"; ( cd "$BTGT2" && git init -q -b main . )
"$BSRC2/scripts/adopt/install.sh" "$BTGT2" >/dev/null 2>&1
[ "$(find "$BTGT2" -name '*.vantry-bak-*' 2>/dev/null | wc -l | tr -d ' ')" = "0" ] \
  && ok "the non-git fallback excludes them too" \
  || bad "a source that is not a git repo still shipped backup files" "$(find "$BTGT2" -name '*.vantry-bak-*' | head -3)"

echo
echo "── upgrade ships the kit too, never a local secret file ──"
# upgrade.sh walked skills/, scripts/, … with a bare `find`, after install.sh
# had stopped doing that. A credentials file kept in the kit's working copy
# (gitignored, so a clone never has one) went into the target repository on
# every upgrade, one `git add -A` away from being pushed.
for S in "$BSRC" "$BSRC2"; do
  printf 'LOCAL_ONLY_VALUE=placeholder-for-the-test\n' > "$S/skills/.env"
  printf 'LOCAL_ONLY_VALUE=placeholder-for-the-test\n' > "$S/scripts/.env.local"
  mkdir -p "$S/skills/zz-upgrade-probe"; printf '# probe\n' > "$S/skills/zz-upgrade-probe/SKILL.md"
done
( cd "$BSRC" && git add skills/zz-upgrade-probe/SKILL.md )   # tracked, as a new kit file would be
for pair in "$BSRC:$BTGT:git" "$BSRC2:$BTGT2:non-git"; do
  S="${pair%%:*}"; rest="${pair#*:}"; T="${rest%%:*}"; how="${rest#*:}"
  UOUT="$(bash "$S/scripts/adopt/upgrade.sh" "$T" 2>&1)"
  if [ -e "$T/skills/.env" ] || [ -e "$T/scripts/.env.local" ]; then
    bad "upgrade ($how source) copied a local secret file into the target" "$(find "$T/skills" "$T/scripts" -maxdepth 1 -name '.env*')"
  else ok "upgrade ($how source) copies no .env file"; fi
  # the SOURCE's stamp only: upgrade.sh legitimately backs up a file it replaces
  [ "$(find "$T" -name '*.vantry-bak-20260101-120000' 2>/dev/null | wc -l | tr -d ' ')" = "0" ] \
    && ok "…nor the source's backup files" || bad "upgrade ($how) shipped backup files" ""
  [ -f "$T/skills/zz-upgrade-probe/SKILL.md" ] \
    && ok "…while a new kit file still arrives" \
    || bad "upgrade ($how) no longer delivers new kit files" "$(printf '%s' "$UOUT" | tail -8)"
done

echo
echo "── the upgrade never advises making workflows trivial without a reviewer ──"
# The advice said: add ".github/**" to trivial_paths, the security review still
# sees workflows. That second half is only true when sensitive_paths covers
# them, and a project installed from an older kit had no such line. Followed
# as printed, a workflow change carried neither a receipt nor a review.
cp "$BTGT/vantry.yml" "$WORK/bak-tgt.vantry.yml.keep" 2>/dev/null
adv() {  # $1 = sensitive_paths body, $2 = trivial_paths body
  printf 'strictness: standard\ntrivial_paths:\n%s\nsensitive_paths:\n%s\n' "$2" "$1" > "$BTGT/vantry.yml"
  bash "$BSRC/scripts/adopt/upgrade.sh" "$BTGT" --dry-run 2>&1
}
AOUT="$(adv '  - "**/auth/**"' '  - "docs/**"')"
case "$AOUT" in
  *"Workflows still get a security review"*)
    bad "advised trivial workflows to a project whose sensitive_paths misses them" "$AOUT" ;;
  *"in TWO steps"*'".github/workflows/**"'*'".github/**"'*)
    ok "no reviewer for workflows: the advice puts them in sensitive_paths first" ;;
  *) bad "no advice at all for a project missing both lines" "$(printf '%s' "$AOUT" | tail -12)" ;;
esac
AOUT="$(adv '  - ".github/workflows/**"' '  - "docs/**"')"
case "$AOUT" in
  *"Workflows still get a security review"*)
    ok "workflows already sensitive: the advice is the one-step trivial line" ;;
  *) bad "a project that reviews workflows got the wrong advice" "$(printf '%s' "$AOUT" | tail -12)" ;;
esac
AOUT="$(adv '  - "**/auth/**"' '  - ".github/**"')"
case "$AOUT" in
  *"ADVICE — trivial_paths"*|*"in TWO steps"*)
    bad "advised a project that already has the trivial line" "$(printf '%s' "$AOUT" | tail -12)" ;;
  *) ok "a project that already has the trivial line gets no workflow advice" ;;
esac
if [ -f "$WORK/bak-tgt.vantry.yml.keep" ]; then cp "$WORK/bak-tgt.vantry.yml.keep" "$BTGT/vantry.yml"
else rm -f "$BTGT/vantry.yml"; fi

INIT_DIR="$WORK/init-sensitive"; mkdir -p "$INIT_DIR"
( cd "$INIT_DIR" && git init -q -b main . ) >/dev/null 2>&1
mkdir -p "$INIT_DIR/scripts/lib"
cp "$KIT/scripts/verify.sh" "$INIT_DIR/scripts/verify.sh"
cp "$KIT/scripts/lib/"*.sh "$INIT_DIR/scripts/lib/"
( cd "$INIT_DIR" && bash scripts/verify.sh --init ) >/dev/null 2>&1
if [ -f "$INIT_DIR/vantry.yml" ]; then
  ( cd "$INIT_DIR" && . scripts/lib/vantry-common.sh
    vantry_is_trivial .github/workflows/ci.yml && vantry_is_sensitive .github/workflows/ci.yml ) \
    && ok "verify.sh --init: a workflow is trivial for the receipt AND sensitive for review" \
    || bad "verify.sh --init makes workflows trivial with no reviewer" "$(sed -n '/^trivial_paths/,$p' "$INIT_DIR/vantry.yml")"
else
  bad "verify.sh --init wrote no vantry.yml" "$(ls -a "$INIT_DIR")"
fi

echo
echo "── the kit must not silently install a version three releases old ──"
# Reported: "a repo created from the kit pointed at v3.11.0 while the kit was at
# v3.19.0". True, and nothing said so. `~/.vantry` is a shallow clone that never
# refreshes itself, so whoever cloned once in March starts every project in
# September on March's kit. The quickstart made it worse by naming a tag, so the
# clone was pinned AND the number in the docs rotted independently.
SUP="$WORK/stale-upstream"; SKIT="$WORK/stale-kit"
git init -q -b main "$SUP"
G "$SUP" config user.email t@t >/dev/null 2>&1; G "$SUP" config user.name t >/dev/null 2>&1
mkdir -p "$SUP/scripts/adopt"
cp "$KIT/scripts/adopt/install.sh" "$SUP/scripts/adopt/install.sh"
printf '3.11.0\n' > "$SUP/VERSION"; printf 'kit\n' > "$SUP/AGENTS.md"
G "$SUP" add -A >/dev/null 2>&1; G "$SUP" commit -qm "release 3.11.0" >/dev/null 2>&1
G "$SUP" tag v3.11.0 >/dev/null 2>&1
git clone -q --depth 1 "$SUP" "$SKIT" 2>/dev/null
for v in 3.21.1 3.21.2; do
  printf '%s\n' "$v" > "$SUP/VERSION"
  G "$SUP" commit -qam "release $v" >/dev/null 2>&1; G "$SUP" tag "v$v" >/dev/null 2>&1
done

SOUT="$(bash "$SKIT/scripts/adopt/install.sh" --version 2>&1)"
case "$SOUT" in *"latest release: v3.21.2"*)
    ok "--version names the newer release, not just its own" ;;
  *) bad "--version stayed silent about being 10 releases behind" "$SOUT" ;; esac

STGT="$WORK/stale-target"; mkdir -p "$STGT"
( cd "$STGT" && git init -q -b main . && G "$STGT" config user.email t@t && G "$STGT" config user.name t \
  && printf 'x\n' > app.js ) >/dev/null 2>&1
G "$STGT" add -A >/dev/null 2>&1; G "$STGT" commit -qm "feat: app" >/dev/null 2>&1
IOUT="$(bash "$SKIT/scripts/adopt/install.sh" "$STGT" 2>&1)"
case "$IOUT" in *"YOU ARE INSTALLING v3.11.0"*)
    ok "and an install warns, loudly, before you build a project on an old kit" ;;
  *) bad "installed a 10-release-old kit without a word" "$(printf '%s' "$IOUT" | head -5)" ;; esac
case "$IOUT" in *"vantry"*) ok "…and installs anyway — a warning, not a refusal" ;;
  *) bad "the staleness check blocked the install" "$(printf '%s' "$IOUT" | head -5)" ;; esac

bash "$SKIT/scripts/adopt/install.sh" --update-kit >/dev/null 2>&1
[ "$(tr -d '[:space:]' < "$SKIT/VERSION")" = "3.21.2" ] \
  && ok "--update-kit actually moves the kit to the latest release" \
  || bad "--update-kit left the kit behind" "VERSION=$(cat "$SKIT/VERSION")"
# A branch-tracking clone must STAY on its branch. Checking out the tag would
# detach it, the next --update-kit would find nothing to do, and the kit would
# freeze at the very version this command exists to prevent.
[ "$(G "$SKIT" symbolic-ref --quiet --short HEAD 2>/dev/null)" = "main" ] \
  && ok "…without detaching the clone, so it can update again next time" \
  || bad "--update-kit detached the kit clone" "HEAD=$(G "$SKIT" rev-parse --abbrev-ref HEAD)"

# and the quickstart itself must not hand out a version number as the default
QS="$(grep -A3 'git clone --depth 1 https' "$KIT/README.md" | head -1)"
case "$QS" in *--branch*) bad "the default quickstart clone is pinned to a tag" "$QS" ;;
  *) ok "the quickstart's default clone names no version — the newest is the default" ;; esac

echo
echo "── an API error must never read as 'protected' ──"
# This has now bitten twice in the same file. `gh api` writes its error body to
# STDOUT and exits non-zero; code that judges "did it print something" then reads
# a 403 as an answer. The first instance made an unprotected branch look
# protected. The second survived the fix and was worse: `[ "$RULES" -eq 0 ]` on a
# non-numeric string fails as a SYNTAX error, not as false, so the script fell
# through and announced "an active ruleset covers this repository" to a
# repository whose API had just said "Upgrade to GitHub Pro".
#
# A gate-checking script that reports PROTECTED because the permission check
# errored is the exact defect this repo exists to catch, shipped inside the
# catcher. It gets a test.
STUB="$WORK/protstub"; mkdir -p "$STUB"
cat > "$STUB/gh" <<'GHEOF'
#!/usr/bin/env bash
case "$*" in
  *"nameWithOwner"*) echo "acme/widget"; exit 0 ;;
  *"/rulesets"*)
    # exactly what GitHub sends for a private repo on the free plan
    echo '{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","status":"403"}'
    exit 1 ;;
  *"/protection"*) echo '{"message":"Branch not protected","status":"404"}'; exit 1 ;;
esac
exit 0
GHEOF
chmod +x "$STUB/gh"
POUT="$(cd "$KIT" && PATH="$STUB:$PATH" bash scripts/check-protection.sh 2>&1)"
PRC=$(cd "$KIT" && PATH="$STUB:$PATH" bash scripts/check-protection.sh >/dev/null 2>&1; echo $?)

case "$POUT" in
  *"✓ an active ruleset covers"*|*"✓ 'main' is protected"*)
    bad "a 403 from the rulesets API was reported as PROTECTED" "$(printf '%s' "$POUT" | head -3)" ;;
  *) ok "a 403 from the rulesets API is not reported as protected" ;;
esac
case "$POUT" in *"CANNOT DETERMINE"*) ok "…it says it cannot determine, which is the honest answer" ;;
  *) bad "did not say it could not determine" "$(printf '%s' "$POUT" | head -3)" ;; esac
case "$POUT" in *"Upgrade to GitHub Pro"*|*"GitHub Pro"*)
    ok "…and surfaces WHY: rulesets need Pro on a private repo" ;;
  *) bad "swallowed the reason GitHub gave" "$(printf '%s' "$POUT" | head -4)" ;; esac
[ "$PRC" != "0" ] && ok "…and exits non-zero, so a pipeline cannot read it as a pass" \
  || bad "exited 0 while unable to determine protection" "rc=$PRC"

# and the honest negative: both APIs answer, nothing is protected
cat > "$STUB/gh" <<'GHEOF'
#!/usr/bin/env bash
case "$*" in
  *"nameWithOwner"*) echo "acme/widget"; exit 0 ;;
  *"/rulesets"*)     echo '[]'; exit 0 ;;
  *"/protection"*)   echo '{"message":"Branch not protected","status":"404"}'; exit 1 ;;
esac
exit 0
GHEOF
NOUT="$(cd "$KIT" && PATH="$STUB:$PATH" bash scripts/check-protection.sh 2>&1)"
case "$NOUT" in *"is NOT protected"*) ok "an answered 'no rulesets' still reports NOT protected" ;;
  *) bad "a genuinely unprotected branch was not reported" "$(printf '%s' "$NOUT" | head -3)" ;; esac

echo
echo "=============================================================="
echo " T30 — the release check never waits on a prompt (#5)"
echo "=============================================================="
# A private or moved origin made `git ls-remote` ask for credentials, and the
# install hung forever. The stub git below behaves like that remote: ls-remote
# blocks. The installer must give up on time, say so, and still install.
STUB5="$WORK/stub5"; mkdir -p "$STUB5"; T5LOG="$WORK/stub5.log"
REALGIT="$(command -v git)"
cat > "$STUB5/git" <<GITEOF
#!/usr/bin/env bash
case " \$* " in
  *" ls-remote "*) printf '%s\n' "\${GIT_TERMINAL_PROMPT:-unset}" > "$T5LOG"; exec sleep 300 ;;
esac
exec "$REALGIT" "\$@"
GITEOF
chmod +x "$STUB5/git"
P30="$WORK/p30"; mkdir -p "$P30"; git -C "$P30" init -q
T0=$SECONDS
OUT30="$(PATH="$STUB5:$PATH" VANTRY_REMOTE_TIMEOUT=3 DRY_RUN=1 "$KIT/scripts/adopt/install.sh" "$P30" 2>&1 </dev/null)"; RC30=$?
EL30=$((SECONDS - T0))
if [ -f "$T5LOG" ]; then
  [ "$EL30" -lt 120 ] && ok "a remote that never answers is abandoned on time (${EL30}s)" \
    || bad "the release check waited ${EL30}s" "$(printf '%s' "$OUT30" | tail -3)"
  [ "$RC30" = "0" ] && ok "the install still succeeds (rc=0)" || bad "the install failed" "rc=$RC30 $(printf '%s' "$OUT30" | tail -3)"
  case "$OUT30" in *"could not check"*) ok "the user is told the check could not run" ;;
    *) bad "no message about the skipped check" "$(printf '%s' "$OUT30" | head -5)" ;; esac
  [ "$(cat "$T5LOG")" = "0" ] && ok "git is told never to prompt (GIT_TERMINAL_PROMPT=0)" \
    || bad "git may still prompt" "GIT_TERMINAL_PROMPT=$(cat "$T5LOG")"
else
  ok "no origin on this checkout — the release check is not attempted (nothing can wait)"
fi

echo
echo "=============================================================="
echo " T31 — vendored files survive a CRLF checkout (#6)"
echo "=============================================================="
# core.autocrlf=true is the default on Windows. Files with no extension (the
# vendored LICENSEs, the manifest) were checked out CRLF, their hashes no longer
# matched vendor/MANIFEST.sha256, and AC-8 failed on every Windows clone.
P31="$WORK/p31"; kit_copy "$KIT" "$P31"
git -C "$P31" init -q
git -C "$P31" config core.autocrlf true
git -C "$P31" add -A >/dev/null 2>&1
rm -rf "$P31/vendor"
git -C "$P31" checkout -- vendor >/dev/null 2>&1
OUT31="$(cd "$P31" && bash scripts/check-vendored.sh 2>&1)" \
  && ok "check-vendored passes on a core.autocrlf=true checkout" \
  || bad "a CRLF checkout breaks the vendored hashes" "$(printf '%s' "$OUT31" | grep -m3 '✗\|<\|>')"
LIC="$(cd "$P31" && ls vendor/skills/*/LICENSE* 2>/dev/null | head -1)"
if [ -n "$LIC" ]; then
  printf 'x' >> "$P31/$LIC"
  (cd "$P31" && bash scripts/check-vendored.sh >/dev/null 2>&1) \
    && bad "check-vendored missed a changed vendored file" "$LIC" \
    || ok "and it still catches a changed vendored file"
else
  bad "no vendored licence found to tamper with" "$(ls "$P31/vendor/skills" 2>&1 | head -3)"
fi

echo
echo "=============================================================="
printf " RESULT: %d passed, %d failed\n" "$PASS" "$FAIL"
echo "=============================================================="
rm -rf "$WORK"
[ "$FAIL" -eq 0 ] || exit 1
