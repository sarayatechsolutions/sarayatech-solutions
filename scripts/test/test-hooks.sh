#!/usr/bin/env bash
# ============================================================================
#  test-hooks.sh — proves the two hook layers behave.
#
#  Layer 3b (git) is the guarantee: it must block a real `git push` to a real
#  remote, and it must NEVER disable a hook the project already had.
#  Layer 3a (Claude) is the accelerator: same verdict, earlier, and it must
#  refuse to trap a session.
#
#  Usage: bash scripts/test/test-hooks.sh [kit-path]
# ============================================================================
set -uo pipefail
KIT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
KIT="$(cd "$KIT" && pwd)"
WORK="$(mktemp -d)"
PASS=0; FAIL=0
ok()  { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; [ -n "${2:-}" ] && echo "$2" | sed 's/^/        /' | head -10; FAIL=$((FAIL + 1)); }
hdr() { echo; echo "── $1 ─────────────────────────────────────────────"; }
G() { git -C "$1" -c user.email=t@t -c user.name=t "${@:2}"; }

make_project() {  # $1 = dir
  local P="$1"
  mkdir -p "$P/src" "$P/scripts/lib" "$P/.githooks" "$P/.claude/hooks"
  cp "$KIT/scripts/verify.sh"             "$P/scripts/"
  cp "$KIT/scripts/lib/vantry-common.sh"  "$P/scripts/lib/"
  cp "$KIT/scripts/lib/enable-hooks.sh"   "$P/scripts/lib/"
  cp "$KIT"/.githooks/*                   "$P/.githooks/"
  cp "$KIT"/.claude/hooks/*               "$P/.claude/hooks/"
  cp "$KIT/.gitleaks.toml"                "$P/"
  chmod +x "$P/scripts/verify.sh" "$P/scripts/lib/enable-hooks.sh" "$P"/.githooks/* "$P"/.claude/hooks/*
  echo 'ok' > "$P/src/status.txt"
  printf '#!/usr/bin/env bash\ngrep -q ok src/status.txt && echo "smoke ok"\n' > "$P/smoke.sh"
  chmod +x "$P/smoke.sh"
  cat > "$P/vantry.yml" <<'Y'
version: 2
project_type: service
strictness: standard
run:
  test: true
  smoke: bash smoke.sh
gates:
  verify_change: block
merge:
  authority: human
  base: main
trivial_paths:
  - "*.md"
sensitive_paths:
  - "src/auth/**"
Y
  printf '.vantry/receipts/\n.vantry/state/\n' > "$P/.gitignore"
  git -C "$P" init -q -b main
  G "$P" add -A >/dev/null; G "$P" commit -qm "chore: init"
}

# ============================================================================
hdr "T1 · enable-hooks on a clean repo"
P="$WORK/t1"; make_project "$P"
( cd "$P" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
[ "$(git -C "$P" config --local --get core.hooksPath)" = ".githooks" ] \
  && ok "core.hooksPath set when nothing was in the way" || bad "hooksPath not set" "$(git -C "$P" config --local --list)"

hdr "T2 · enable-hooks NEVER disables husky"
P="$WORK/t2"; make_project "$P"
mkdir -p "$P/.husky"
# `exit 0` at the end is what husky, lint-staged and most hand-written hooks
# actually do — and it is what made the appended vantry block unreachable.
printf '#!/usr/bin/env bash\necho HUSKY-RAN\nexit 0\n' > "$P/.husky/pre-commit"; chmod +x "$P/.husky/pre-commit"
git -C "$P" config core.hooksPath .husky
( cd "$P" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
[ "$(git -C "$P" config --local --get core.hooksPath)" = ".husky" ] \
  && ok "husky's hooksPath left alone" || bad "hooksPath was hijacked" "$(git -C "$P" config --local --get core.hooksPath)"
# Assert REACHABILITY, not the presence of a marker. Grepping for the marker is
# exactly what reported ACTIVE while the stage was dead code.
( cd "$P" && VANTRY_HOOK_PROBE=1 .husky/pre-commit /dev/null 2>&1 ) | grep -q VANTRY_HOOK_REACHED \
  && ok "the probe REACHES vantry's stage through husky's hook" \
  || bad "vantry's stage is unreachable behind husky's hook" "$(cat "$P/.husky/pre-commit")"
echo "x" > "$P/f.txt"; G "$P" add f.txt >/dev/null
OUT="$(G "$P" commit -m "chore: t" 2>&1)"
case "$OUT" in *HUSKY-RAN*) ok "husky's own hook still runs" ;; *) bad "husky hook stopped running" "$OUT" ;; esac

hdr "T3 · enable-hooks NEVER disables .git/hooks"
P="$WORK/t3"; make_project "$P"
printf '#!/usr/bin/env bash\necho LEGACY-RAN\nexit 0\n' > "$P/.git/hooks/pre-commit"; chmod +x "$P/.git/hooks/pre-commit"
( cd "$P" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
[ -z "$(git -C "$P" config --local --get core.hooksPath)" ] \
  && ok "hooksPath left unset (would have killed .git/hooks)" || bad "hooksPath set anyway" ""
echo "x" > "$P/f.txt"; G "$P" add f.txt >/dev/null
OUT="$(G "$P" commit -m "chore: t" 2>&1)"
case "$OUT" in *LEGACY-RAN*) ok "the pre-existing hook still runs" ;; *) bad "legacy hook broken" "$OUT" ;; esac
# THE regression. A repo whose hook ends in `exit 0` used to accept a secret
# cleanly while --status reported ACTIVE. Proven by committing an AWS key.
printf 'const k = "AKIA%s";\n' "J7QF2M4XZ9WD3PLK" > "$P/leak.ts"
G "$P" add -A >/dev/null
OUT="$(G "$P" commit -m "feat: key" 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "a secret is REFUSED even behind a hook ending in exit 0" \
  || bad "the secret got in — vantry's stage is unreachable again" "$OUT"
rm -f "$P/leak.ts"; G "$P" reset -q >/dev/null
STOUT="$( cd "$P" && ./scripts/lib/enable-hooks.sh --status . 2>&1 )"
case "$STOUT" in
  *"pre-commit : ACTIVE"*) ok "--status reports the stage reached" ;;
  *) bad "--status could not prove the stage is reached" "$STOUT" ;;
esac
# The NEGATIVE is what proves --status is not just grepping for its own marker:
# a hook that CONTAINS the marker but exits before vantry's stage must report
# NOT REACHED. This assertion fails under the old marker-grep implementation.
FAKE="$P/.git/hooks/commit-msg"
printf '#!/usr/bin/env bash\n# >>> vantry hooks >>>\necho "marker present but unreachable"\nexit 0\n# <<< vantry hooks <<<\n' > "$FAKE"
chmod +x "$FAKE"
STOUT2="$( cd "$P" && ./scripts/lib/enable-hooks.sh --status . 2>&1 )"
case "$STOUT2" in
  *"commit-msg : ✗ NOT REACHED"*) ok "a hook carrying the marker but exiting first is reported NOT REACHED" ;;
  *) bad "--status believed a marker over a behaviour" "$STOUT2" ;;
esac

hdr "T4 · enable-hooks is idempotent and reversible"
( cd "$P" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
N="$(grep -c "vantry hooks >>>" "$P/.git/hooks/pre-commit")"
[ "$N" = "1" ] && ok "a second run does not double-chain" || bad "chained $N times" ""
( cd "$P" && ./scripts/lib/enable-hooks.sh --disable . ) >/dev/null 2>&1
grep -q "vantry hooks" "$P/.git/hooks/pre-commit" && bad "--disable left the block behind" "" || ok "--disable removes the block"
OUT="$(G "$P" commit --allow-empty -m "chore: t2" 2>&1)"
case "$OUT" in *LEGACY-RAN*) ok "the project's hook survives --disable intact" ;; *) bad "disable damaged it" "$OUT" ;; esac

hdr "T5 · commit-msg enforces Conventional Commits"
P="$WORK/t5"; make_project "$P"
( cd "$P" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
echo "x" > "$P/README.md"; G "$P" add -A >/dev/null
OUT="$(G "$P" commit -m "updated some stuff" 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "a non-conventional subject is refused" || bad "junk subject accepted" "$OUT"
case "$OUT" in *"Conventional Commit"*) ok "the message explains the format" ;; *) bad "unhelpful message" "$OUT" ;; esac
# The way forward is a better subject, never skipping every hook (secret scan included).
case "$OUT" in *"git commit --no-verify"*) bad "the refusal recommends --no-verify" "$OUT" ;;
  *"git commit -m"*) ok "the refusal shows the retry, not a bypass" ;; *) bad "the refusal offers no way forward" "$OUT" ;; esac
G "$P" commit -qm "docs: update the readme" >/dev/null 2>&1 && ok "a conventional subject is accepted" || bad "valid subject refused" ""
G "$P" commit --allow-empty -qm "Merge branch 'x'" >/dev/null 2>&1 && ok "git's own Merge wording is not policed" || bad "merge commit refused" ""

hdr "T6 · pre-commit catches a staged secret"
P="$WORK/t6"; make_project "$P"
( cd "$P" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
printf 'const k = "AKIA%s";\n' "J7QF2M4XZ9WD3PLK" > "$P/src/leak.ts"
G "$P" add -A >/dev/null
OUT="$(G "$P" commit -m "feat: add key" 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "an AWS-shaped key blocks the commit" || bad "secret committed" "$OUT"
case "$OUT" in *"possible secret"*|*"COMMIT REFUSED"*) ok "it names the file" ;; *) bad "no explanation" "$OUT" ;; esac
rm "$P/src/leak.ts"; G "$P" reset -q >/dev/null
printf 'GITHUB_TOKEN=ghp_%s\n' "R7kQm2Xv9ZbN4wLpT6yH1sJ8dF3gC5aE0uI" > "$P/.env"
G "$P" add -f .env >/dev/null 2>&1
OUT="$(G "$P" commit -m "chore: env" 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "an .env file is refused outright" || bad ".env committed" "$OUT"
rm -f "$P/.env"; G "$P" reset -q >/dev/null

# The failure that showed up the first time the kit was installed for real:
# it ships its own secret-scanner fixtures, so a project's very next commit
# died on the kit's test data. A guard that fires on day one gets removed.
mkdir -p "$P/scripts/test" "$P/evals"
printf 'const k = "AKIAIOSFODNN7EXAMPLE";\n' > "$P/scripts/test/fixture-secrets.sh"
printf 'token = "ghp_EXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLE"\n'  > "$P/evals/sample.txt"
printf 'const documented = "AKIAIOSFODNN7EXAMPLE"; // AWS docs\n' > "$P/src/docs.ts"
G "$P" add -A >/dev/null
G "$P" commit -qm "test: add scanner fixtures" >/dev/null 2>&1 \
  && ok "test fixtures and EXAMPLE-marked strings do not block a commit" \
  || bad "false positive on the kit's own fixtures" "$(G "$P" commit -m "test: x" 2>&1)"

hdr "T7 · pre-push BLOCKS an unverified push (the universal guarantee)"
P="$WORK/t7"; make_project "$P"
( cd "$P" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
git init -q --bare "$WORK/t7-remote.git"
git -C "$P" remote add origin "$WORK/t7-remote.git"
G "$P" push -q origin main >/dev/null 2>&1   # baseline push, nothing changed yet
git -C "$P" checkout -qb feat/thing
echo '// unverified' > "$P/src/new.ts"
G "$P" add -A >/dev/null; G "$P" commit -qm "feat: a thing" >/dev/null 2>&1
OUT="$(G "$P" push origin feat/thing 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "push REFUSED with no receipt (rc=$RC)" || bad "unverified push went through" "$OUT"
case "$OUT" in *"PUSH REFUSED"*) ok "it says why" ;; *) bad "no refusal banner" "$OUT" ;; esac
( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
OUT="$(G "$P" push origin feat/thing 2>&1)"; RC=$?
[ "$RC" = "0" ] && ok "push succeeds once verified" || bad "verified push still refused" "$OUT"

hdr "T8 · the emergency lever works and is loud"
git -C "$P" checkout -q feat/thing
echo '// more' >> "$P/src/new.ts"
G "$P" add -A >/dev/null; G "$P" commit -qm "feat: more" >/dev/null 2>&1
OUT="$(G "$P" push origin feat/thing 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "the new edit re-blocks the push" || bad "stale receipt let it through" "$OUT"
OUT="$(VANTRY_SKIP_GATE=1 G "$P" push origin feat/thing 2>&1)"; RC=$?
[ "$RC" = "0" ] && ok "VANTRY_SKIP_GATE=1 lets a human through" || bad "escape hatch broken" "$OUT"
case "$OUT" in *"bypassed on purpose"*) ok "the bypass announces itself" ;; *) bad "silent bypass" "$OUT" ;; esac
grep -q "gate.skip" "$P/.vantry/state/agent-log.jsonl" 2>/dev/null && ok "the bypass is written to the audit log" || bad "bypass not logged" ""

hdr "T9 · a non-vantry repo is never touched"
P="$WORK/t9"; make_project "$P"; rm -f "$P/vantry.yml"
( cd "$P" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
git init -q --bare "$WORK/t9-remote.git"; git -C "$P" remote add origin "$WORK/t9-remote.git"
echo "x" > "$P/src/a.ts"; G "$P" add -A >/dev/null
G "$P" commit -qm "anything at all, not conventional" >/dev/null 2>&1 \
  && ok "commit-msg stays out of a non-vantry repo" || bad "policed a repo with no contract" ""
G "$P" push -q origin main >/dev/null 2>&1 && ok "pre-push stays out too" || bad "blocked a non-vantry push" ""

# ============================================================================
hdr "T10 · the Claude Stop hook blocks, then escalates"
P="$WORK/t10"; make_project "$P"
echo '// unverified' > "$P/src/new.ts"
HOOK() { ( cd "$P" && printf '{}' | ./.claude/hooks/verify-gate.sh 2>&1 ); }
RC1=$( ( cd "$P" && printf '{}' | ./.claude/hooks/verify-gate.sh >/dev/null 2>&1 ); echo $? )
[ "$RC1" = "2" ] && ok "exit 2 — the turn cannot end (1st block)" || bad "did not block" "rc=$RC1"
OUT="$(HOOK)"
case "$OUT" in *"BLOCKED BY VANTRY"*) ok "the model is told exactly what to do" ;; *) bad "unhelpful stderr" "$OUT" ;; esac
RC3=$( ( cd "$P" && printf '{}' | ./.claude/hooks/verify-gate.sh >/dev/null 2>&1 ); echo $? )
[ "$RC3" = "0" ] && ok "3rd attempt escalates to the human instead of looping" || bad "still looping at attempt 3" "rc=$RC3"
RC4=$( ( cd "$P" && printf '{"stop_hook_active": true}' | ./.claude/hooks/verify-gate.sh >/dev/null 2>&1 ); echo $? )
[ "$RC4" = "0" ] && ok "stop_hook_active is honoured (no re-entry loop)" || bad "ignored stop_hook_active" "rc=$RC4"

# A fan-out where every subagent must run the full suite before returning is
# the "too heavy, disable it" failure. The orchestrator owns the gate.
SUBP='{"hook_event_name":"SubagentStop"}'
RCS=$( ( cd "$P" && printf '%s' "$SUBP" | ./.claude/hooks/verify-gate.sh >/dev/null 2>&1 ); echo $? )
[ "$RCS" = "0" ] && ok "SubagentStop reports without blocking (default)" || bad "a subagent was trapped by the gate" "rc=$RCS"
OUTS=$( cd "$P" && printf '%s' "$SUBP" | ./.claude/hooks/verify-gate.sh 2>&1 )
case "$OUTS" in *"orchestrator owns the gate"*) ok "…and still says so out loud" ;; *) bad "silent subagent pass" "$OUTS" ;; esac
printf '\ngates:\n  subagent_verify: block\n' >> "$P/vantry.yml"
RCS2=$( ( cd "$P" && printf '%s' "$SUBP" | ./.claude/hooks/verify-gate.sh >/dev/null 2>&1 ); echo $? )
[ "$RCS2" = "2" ] && ok "subagent_verify: block makes it blocking (worktree isolation)" || bad "opt-in did not engage" "rc=$RCS2"
sed -i.bak '/subagent_verify/d' "$P/vantry.yml"; rm -f "$P/vantry.yml.bak"
( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
RC5=$( ( cd "$P" && printf '{}' | ./.claude/hooks/verify-gate.sh >/dev/null 2>&1 ); echo $? )
[ "$RC5" = "0" ] && ok "passes once the change is verified" || bad "still blocking after a pass" "$(HOOK)"

hdr "T11 · the Bash guard denies the four escapes"
P="$WORK/t11"; make_project "$P"
echo '// unverified' > "$P/src/new.ts"
guard() { ( cd "$P" && printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$1" | ./.claude/hooks/bash-guard.sh 2>&1 ); }
grc()   { ( cd "$P" && printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$1" | ./.claude/hooks/bash-guard.sh >/dev/null 2>&1 ); echo $?; }
[ "$(grc '"echo x > .vantry/receipts/main.verify.json"')" = "2" ] && ok "forging a receipt is denied" || bad "receipt write allowed" "$(guard '"echo x > .vantry/receipts/main.verify.json"')"
[ "$(grc '"cat .vantry/receipts/main.verify.json"')" = "0" ] && ok "READING a receipt is still allowed" || bad "reading denied" ""
[ "$(grc '"git config core.hooksPath .x"')" = "2" ] && ok "changing core.hooksPath is denied" || bad "hooksPath allowed" ""
[ "$(grc '"git commit --no-verify -m x"')" = "2" ] && ok "--no-verify is denied" || bad "no-verify allowed" ""
# A commit is local and undoable: gated only at strict, as .githooks/pre-commit
# has always been. What leaves the machine stays gated at every strictness.
[ "$(grc '"git commit -m \"feat: x\""')" = "0" ] && ok "an unverified COMMIT is allowed at standard (local, undoable)" || bad "unverified commit denied at standard" "$(guard '"git commit -m x"')"
[ "$(grc '"git push origin HEAD"')" = "2" ] && ok "pushing unverified work is denied" || bad "unverified push allowed" "$(guard '"git push origin HEAD"')"
[ "$(grc '"gh pr create --base main --title x --body y"')" = "2" ] && ok "opening a PR on unverified work is denied" || bad "unverified PR allowed" "$(guard '"gh pr create --base main --title x --body y"')"
[ "$(grc '"git commit -m x && git push"')" = "2" ] && ok "a commit chained to a push is judged as the push" || bad "commit && push allowed" "$(guard '"git commit -m x && git push"')"
sed -i.bak 's/^strictness: standard/strictness: strict/' "$P/vantry.yml"; rm -f "$P/vantry.yml.bak"
[ "$(grc '"git commit -m \"feat: x\""')" = "2" ] && ok "at strict, committing unverified work is denied" || bad "unverified commit allowed at strict" "$(guard '"git commit -m x"')"
[ "$(grc '"rm -rf .githooks"')" = "2" ] && ok "deleting the hooks is denied" || bad "hook deletion allowed" ""
[ "$(grc '"gh pr merge 12 --squash"')" = "2" ] && ok "merging is denied while merge.authority: human" || bad "agent merge allowed" ""
[ "$(grc '"ls -la"')" = "0" ] && ok "ordinary commands pass straight through" || bad "false positive on ls" "$(guard '"ls -la"')"
( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
# strict also requires an observation on the receipt; record one, as an agent must.
( cd "$P" && ./scripts/verify.sh --observe "the guard lets a verified commit through" "verified at strict, observation recorded by the test" ) >/dev/null 2>&1
[ "$(grc '"git commit -m \"feat: x\""')" = "0" ] && ok "commit allowed once verified (strict)" || bad "still denied after verify" "$(guard '"git commit -m x"')"
[ "$(grc '"git push origin HEAD"')" = "0" ] && ok "push allowed once verified" || bad "push still denied after verify" "$(guard '"git push origin HEAD"')"
sed -i.bak 's/^strictness: strict/strictness: standard/' "$P/vantry.yml"; rm -f "$P/vantry.yml.bak"

hdr "T11b · the guard matches INTENT, not text in a payload"
# A guard that fires on its own release notes is a guard somebody uninstalls.
# These all MENTION an escape hatch; none of them USE one.
[ "$(grc '"git commit -F - <<MSG\nfix: document VANTRY_SKIP_GATE and --no-verify\nMSG"')" = "0" ] \
  && ok "a commit message mentioning the escape hatches is allowed" \
  || bad "false positive on a heredoc commit message" "$(guard '"git commit -F - <<MSG\nfix: document VANTRY_SKIP_GATE and --no-verify\nMSG"')"
[ "$(grc '"echo \"never run: git config core.hooksPath .x\" >> docs/notes.md"')" = "0" ] \
  && ok "a quoted mention of core.hooksPath is allowed" || bad "false positive on a quoted string" ""
[ "$(grc '"grep -rn VANTRY_SKIP_GATE .githooks"')" = "0" ] \
  && ok "grepping for the lever is allowed" || bad "false positive on grep" ""
# …and the real thing is still denied.
[ "$(grc '"VANTRY_SKIP_GATE=1 git push origin main"')" = "2" ] \
  && ok "actually SETTING the lever is still denied" || bad "the real escape slipped through" ""
[ "$(grc '"git config core.hooksPath .x"')" = "2" ] \
  && ok "actually setting hooksPath is still denied" || bad "real hooksPath change allowed" ""

# A wrapper defeats the scrub by design: sh -c puts the whole escape inside a
# quoted span, which scrub() removes. The audit found this exact false negative.
NV="--no-""verify"
[ "$(grc "\"sh -c 'git push $NV origin main'\"")" = "2" ] \
  && ok "the escape hidden inside sh -c is still denied" \
  || bad "a wrapper command smuggles the escape past the guard" "$(guard "\"sh -c 'git push $NV origin main'\"")"
[ "$(grc "\"bash -c \\\"git commit $NV -m x\\\"\"")" = "2" ] \
  && ok "…and inside bash -c" || bad "bash -c wrapper allowed" ""
[ "$(grc '"grep -rn wrapper docs/"')" = "0" ] \
  && ok "and an ordinary command with no wrapper still passes" || bad "false positive after the wrapper rule" ""
# Reading the setting is how you DIAGNOSE the gate; only writing it disarms one.
# A guard that blocks inspection is the false-positive its own header warns about.
HP="core.hooks""Path"
[ "$(grc "\"git config --get $HP\"")" = "0" ] \
  && ok "reading the hooks setting is allowed" || bad "the guard blocks read-only inspection" ""
[ "$(grc "\"scripts/lib/enable-hooks.sh --status\"")" = "0" ] \
  && ok "the tool the guard recommends is not itself denied" || bad "the recommended tool is denied" ""
[ "$(grc "\"git config $HP .x\"")" = "2" ] \
  && ok "…and writing it is still denied" || bad "the write escape reopened" ""

hdr "T11c · the guard never stops another project's processes"
# 17 Oct 2026: an agent cleared its own stuck gate by killing every process whose
# command line matched verify.sh. The other project on the machine ran the same
# script, and lost three 75-minute gates in a day.
[ "$(grc '"pkill -f verify.sh"')" = "2" ] && ok "pkill by pattern is denied" || bad "pkill allowed" "$(guard '"pkill -f verify.sh"')"
[ "$(grc '"taskkill //F //IM java.exe"')" = "2" ] && ok "taskkill by image name is denied" || bad "taskkill //IM allowed" ""
[ "$(grc '"Stop-Process -Name java -Force"')" = "2" ] && ok "Stop-Process -Name is denied" || bad "Stop-Process -Name allowed" ""
[ "$(grc '"Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match verify } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"')" = "2" ] \
  && ok "a process query piped into Stop-Process is denied" || bad "CIM select-and-kill allowed" ""
[ "$(grc '"kill $(pgrep -f verify.sh)"')" = "2" ] && ok "kill \$(pgrep …) is denied" || bad "kill \$(pgrep) allowed" ""
[ "$(grc '"pgrep java | xargs kill"')" = "2" ] && ok "a listing piped into xargs kill is denied" || bad "xargs kill allowed" ""
OTHER="$WORK/t11c-other"; mkdir -p "$OTHER"; git -C "$OTHER" init -q
( cd "$OTHER" && exec sleep 60 ) & OPID=$!
( cd "$P" && exec sleep 60 ) & MPID=$!
sleep 1
if [ -e "/proc/$OPID/cwd" ]; then
  [ "$(grc "\"kill $OPID\"")" = "2" ] && ok "kill of a PID working in another project is denied" \
    || bad "another project's PID was allowed" "$(guard "\"kill $OPID\"")"
  [ "$(grc "\"kill $MPID\"")" = "0" ] && ok "kill of a PID working in this project is allowed" \
    || bad "own PID denied" "$(guard "\"kill $MPID\"")"
else
  ok "no /proc here: the PID check is skipped (by-name rules still apply)"
fi
kill "$OPID" "$MPID" 2>/dev/null; wait "$OPID" "$MPID" 2>/dev/null
[ "$(grc '"Stop-Process -Id 999999 -Force"')" = "0" ] && ok "Stop-Process -Id on an unknown PID is allowed" || bad "false positive on Stop-Process -Id" ""
[ "$(grc '"git commit -F - <<MSG\nfix: never pkill or taskkill //IM a shared tool\nMSG"')" = "0" ] \
  && ok "a commit message mentioning pkill is allowed" \
  || bad "false positive on a heredoc mentioning pkill" "$(guard '"git commit -F - <<MSG\nfix: never pkill\nMSG"')"
# #8: Windows and PowerShell ignore case and accept abbreviations. Each of
# these stops processes by name and passed the old, exact-spelling match.
for c in 'taskkill /f /im node.exe' 'TASKKILL /F /IM node.exe' 'taskkill /F /FI \"IMAGENAME eq node.exe\"' \
         'stop-process -name node' 'Stop-Process -N node' 'kill -Name node' 'spps -n node' \
         'Stop-Process -ProcessName:java' 'wmic process where name=\"node.exe\" delete' \
         'wmic PROCESS where caption=\"java.exe\" call terminate'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "by name, any case or abbreviation, is denied: $c" \
    || bad "a stop-by-name form slipped through: $c" "$(guard "\"$c\"")"
done
# #9: listing processes is the step the guard's own message asks for.
LIST="for p in \$(ps -ef | awk '{print \$2}'); do readlink /proc/\$p/cwd; done"
[ "$(grc "\"$LIST\"")" = "0" ] && ok "a process listing with no stop verb is allowed" \
  || bad "the guard refuses the listing it recommends" "$(guard "\"$LIST\"")"
[ "$(grc '"kill -n 9 999999"')" = "0" ] && ok "kill -n <signal number> <pid> is by PID, not by name" \
  || bad "false positive on kill -n 9" "$(guard '"kill -n 9 999999"')"
[ "$(grc '"taskkill /PID 999999 /F"')" = "0" ] && ok "taskkill /PID is by PID, and allowed" \
  || bad "false positive on taskkill /PID" "$(guard '"taskkill /PID 999999 /F"')"
for c in 'for p in $(pgrep java); do kill $p; done' 'KILL $(PGREP node)' \
         'for p in `pidof node`; do \"kill\" $p; done'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a listing that feeds a stop is still denied: $c" \
    || bad "select-and-kill slipped through: $c" "$(guard "\"$c\"")"
done
# The security review of #8/#9: a wrapper's payload is quoted, and quoting a
# command word does not stop it running. Each of these stopped processes by
# name, or listed and stopped them, and the guard allowed it (rc 0).
for c in 'powershell -Command \"Stop-Process -Name node\"' \
         'powershell.exe -NoProfile -Command \"Get-Process node | Stop-Process -Force\"' \
         "powershell -c 'spps -n node'" 'cmd //c \"taskkill /F /IM node.exe\"' \
         'cmd.exe /c \"taskkill /f /im node.exe\"' '\"taskkill\" /F /IM node.exe' \
         '\"pkill\" -f verify.sh' 'p\"kill\" -f verify.sh' 'tskill node' \
         'pgrep -f verify.sh | while read p; do kill \"$p\"; done' \
         'k\\ill $(pgrep -f verify.sh)' "ki''ll \$(pgrep -f verify.sh)" \
         'bash <<SH\npkill -f verify.sh\nSH'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "quoting or a wrapper hides nothing: $c" \
    || bad "a quoted or wrapped stop slipped through: $c" "$(guard "\"$c\"")"
done
for c in 'ps -ef | grep verify.sh' 'powershell -c \"Get-Process node\"' \
         'tasklist //FI \"IMAGENAME eq node.exe\"' 'echo \"never run pkill; list, then kill <pid>\"'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "a listing, or prose naming a stop, is allowed: $c" \
    || bad "false positive: $c" "$(guard "\"$c\"")"
done
# The second security review: the first six were denied before the rewrite
# above and allowed after it (a path, builtin, timeout, sudo -u, $'…'); the
# rest were never denied (options before -c, a shell reading a pipe or `-`, a
# quoted path, $"…", !, if, VAR=value, xargs with a path or flags).
for c in '/bin/kill $(pgrep -f verify.sh)' '/usr/bin/kill -9 $(pidof node)' \
         'builtin kill $(pgrep -f verify.sh)' 'timeout 5 kill $(pgrep -f verify.sh)' \
         'sudo -u me kill $(pgrep -f verify.sh)' "\$'kill' \$(pgrep -f verify.sh)" \
         "bash -e -c 'pkill -f verify.sh'" "bash -o pipefail -c 'killall node'" \
         'bash --noprofile --norc -c \"taskkill /F /IM node.exe\"' \
         'bash - <<SH\npkill -f verify.sh\nSH' 'cat <<SH | bash\npkill -f verify.sh\nSH' \
         "echo 'pkill -f verify.sh' | sh" "echo 'Stop-Process -Name node' | pwsh -c -" \
         '\"/usr/bin/pkill\" -f verify.sh' '\"C:\\Windows\\System32\\taskkill.exe\" /F /IM node.exe' \
         '\"C:\\Program Files\\Git\\usr\\bin\\pkill.exe\" -f verify.sh' \
         "\$'pkill' -f verify.sh" '$\"pkill\" -f verify.sh' '! \"pkill\" -f verify.sh' \
         'if \"pkill\" -f verify.sh; then :; fi' 'FOO=1 \"pkill\" -f verify.sh' \
         'pgrep -f verify.sh | xargs /bin/kill' 'pgrep -f verify.sh | xargs -I {} kill {}'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a prefix, a path or a piped shell hides nothing: $c" \
    || bad "a prefixed, pathed or piped stop slipped through: $c" "$(guard "\"$c\"")"
done
for c in '/usr/bin/ps -ef | grep node' 'if ps -p 999999 >/dev/null; then echo up; fi' \
         'timeout 5 bash scripts/verify.sh --status' 'echo \"see docs/a b/x.md\"' \
         'ls \"C:/Program Files/Git/usr/bin\"'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "a listing, a path or prose is still allowed: $c" \
    || bad "false positive: $c" "$(guard "\"$c\"")"
done
# #9: an interpreter beside the receipts stays refused (the guard cannot see
# its script), but the refusal must say which reads pass.
RD='for f in .vantry/receipts/*.json; do python3 - \"$f\" <<PY\nimport json,sys\nprint(json.load(open(sys.argv[1]))[\"verdict\"])\nPY\ndone'
[ "$(grc "\"$RD\"")" = "2" ] && case "$(guard "\"$RD\"")" in *"verify.sh --status"*jq*) true ;; *) false ;; esac \
  && ok "an interpreter beside the receipts is refused, and told which reads pass" \
  || bad "the interpreter refusal is missing or unhelpful" "$(guard "\"$RD\"")"
JQ='for f in .vantry/receipts/*.json; do jq -c \"{verdict}\" \"$f\"; done'
[ "$(grc "\"$JQ\"")" = "0" ] && ok "the read the refusal suggests is itself allowed" \
  || bad "the suggested read is denied" "$(guard "\"$JQ\"")"

hdr "T11d · a PR is opened only on the tree CI will test"
# CI on a pull request builds the MERGE into the base. A branch verified before
# the base moved hands CI a tree nobody ran (an adopting repository: 58 unit
# tests red in CI, from batches verified apart and merged together).
P="$WORK/t11d"; make_project "$P"
R11="$WORK/t11d-remote.git"; C11="$WORK/t11d-clone"
git init -q --bare -b main "$R11"
G "$P" remote add origin "$R11"; G "$P" push -q origin main >/dev/null 2>&1
G "$P" remote set-head origin main >/dev/null 2>&1
G "$P" checkout -q -b feat
echo 'ok, and more' > "$P/src/status.txt"; G "$P" commit -qam "feat: more" >/dev/null
( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
PRC='"gh pr create --base main --title x --body y"'
[ "$(grc "$PRC")" = "0" ] && ok "a verified branch that contains its base may open a PR" || bad "up-to-date PR denied" "$(guard "$PRC")"
git clone -q "$R11" "$C11" 2>/dev/null
echo 'x' > "$C11/src/other.txt"; G "$C11" add -A; G "$C11" commit -qm "feat: other" >/dev/null; G "$C11" push -q origin main >/dev/null 2>&1
if git -C "$P" merge-tree --write-tree HEAD HEAD >/dev/null 2>&1; then
  OUT11d="$(guard "$PRC")"
  [ "$(grc "$PRC")" = "2" ] && case "$OUT11d" in *"git merge origin/main"*) true ;; *) false ;; esac \
    && ok "the base moved on the remote: the PR is refused, and told to merge and re-verify" \
    || bad "a PR whose CI merge was never verified was allowed" "$OUT11d"
  [ "$(grc '"gh pr create --title x --body y"')" = "2" ] && ok "with no --base, the remote's default branch is the base" \
    || bad "no --base: the default branch was not judged" "$(guard '"gh pr create --title x --body y"')"
  # An explicit --head used to skip every check. A head that is not a branch
  # here cannot be vouched for by any receipt: refused, and told why.
  OUT11h="$(guard '"gh pr create --head other --base main --title x"')"
  [ "$(grc '"gh pr create --head other --base main --title x"')" = "2" ] && case "$OUT11h" in *"no branch of that name"*) true ;; *) false ;; esac \
    && ok "a PR whose --head is no branch here is refused, and told why" \
    || bad "a PR from a branch no receipt can cover was allowed" "$OUT11h"
  G "$P" merge -q --no-edit origin/main >/dev/null 2>&1
  ( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
  [ "$(grc "$PRC")" = "0" ] && ok "after merging the base and re-verifying, the PR may open" || bad "still refused after merge + verify" "$(guard "$PRC")"
  # The base gains only a merge of this branch (the develop→main shape): HEAD no
  # longer contains it, yet the merge CI builds IS this tree. No false refusal.
  G "$P" push -q origin feat >/dev/null 2>&1
  G "$C11" pull -q origin main >/dev/null 2>&1; G "$C11" fetch -q origin feat >/dev/null 2>&1
  G "$C11" merge -q --no-ff --no-edit origin/feat >/dev/null 2>&1; G "$C11" push -q origin main >/dev/null 2>&1
  [ "$(grc "$PRC")" = "0" ] && ok "a base that holds only this branch's own merge does not block the PR" \
    || bad "false refusal: the CI merge equals the verified tree" "$(guard "$PRC")"
else
  echo "  - git $(git --version | sed 's/git version //') has no merge-tree --write-tree: the guard cannot judge a moved base and lets the PR open"
  [ "$(grc "$PRC")" = "0" ] && ok "without merge-tree --write-tree, the guard does not guess" || bad "the guard refused what it cannot judge" "$(guard "$PRC")"
fi
# A PR opens only when its own CI can pass. This kit's own PR failed two checks
# that read nothing but the branch (19 Nov 2026): no '## Verification evidence'
# section, and no security verdict on a sensitive diff. Both are asked here first.
G "$P" fetch -q origin >/dev/null 2>&1
G "$P" checkout -q -b feat-auth origin/main
mkdir -p "$P/src/auth" "$P/.github/workflows"
echo 'deny by default' > "$P/src/auth/policy.txt"
echo 'name: evidence' > "$P/.github/workflows/evidence.yml"
G "$P" add -A >/dev/null; G "$P" commit -qm "feat(auth): a policy" >/dev/null
( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
G "$P" push -q origin feat-auth >/dev/null 2>&1
printf '## Summary\nx\n\n## Verification evidence\n<!-- what you ran, what you saw -->\n' > "$WORK/ev-empty.md"
printf '## Summary\nx\n\n## Verification evidence\n- verify.sh passed\n' > "$WORK/ev-full.md"
for c in "gh pr create --base main --title x --body y" "gh pr create --base main --fill" \
         "gh pr create --base main --title x --body-file $WORK/ev-empty.md" "gh pr edit 1 --body-file $WORK/ev-empty.md"; do
  OUT="$(guard "\"$c\"")"
  [ "$(grc "\"$c\"")" = "2" ] && case "$OUT" in *"Verification evidence"*) true ;; *) false ;; esac \
    && ok "refused before CI fails it, no filled evidence section: $c" || bad "a body CI's evidence check fails was allowed: $c" "$OUT"
done
# A body file that never ends (a FIFO, /dev/zero) is never read: a hook held
# until its timeout refuses nothing, and the merge refusal used to come after
# it (security review, 19 Nov 2026). A FIFO with no writer blocks without
# eating memory; a writer releases it if the guard does wait on it.
_nohang() {      # $1 = the command as a JSON string → its exit code, or "hung"
  local zp z=0
  rm -f "$WORK/nohang.rc"
  ( cd "$P" && printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$1" \
      | ./.claude/hooks/bash-guard.sh >/dev/null 2>&1; echo $? > "$WORK/nohang.rc" ) >/dev/null 2>&1 &
  zp=$!
  while [ ! -s "$WORK/nohang.rc" ] && [ "$z" -lt 120 ]; do sleep 1; z=$((z + 1)); done
  if [ -s "$WORK/nohang.rc" ]; then wait "$zp" 2>/dev/null; cat "$WORK/nohang.rc"
  else ( : > "$WORK/ev.fifo" ) >/dev/null 2>&1 & echo hung; fi
}
if mkfifo "$WORK/ev.fifo" 2>/dev/null; then
  R="$(_nohang "\"gh pr merge 1 --squash; echo gh pr edit 1 --body-file $WORK/ev.fifo\"")"
  [ "$R" = 2 ] && ok "a merge beside a never-ending body file is refused, without waiting on it" \
    || bad "the guard waited on a body file before the merge refusal" "rc=$R"
  R="$(_nohang "\"gh pr edit 1 --body-file $WORK/ev.fifo\"")"
  [ "$R" = 0 ] && ok "a body file that is not a regular file is left to CI, not read" \
    || bad "the guard read a FIFO as a PR body" "rc=$R"
else
  echo "  - no mkfifo here: the never-ending body file is not exercised"
fi
PRF="\"gh pr create --base main --title x --body-file $WORK/ev-full.md\""
OUT="$(guard "$PRF")"
[ "$(grc "$PRF")" = "2" ] && case "$OUT" in *"no committed .vantry/reviews/feat-auth.security.json"*) true ;; *) false ;; esac \
  && ok "a sensitive diff with no security verdict is refused before CI fails it" || bad "a PR with no security verdict was allowed" "$OUT"
H11="$(git -C "$P" rev-parse HEAD)"; mkdir -p "$P/.vantry/reviews"
printf '{"verdict":"block","head":"%s"}\n' "$H11" > "$P/.vantry/reviews/feat-auth.security.json"
G "$P" add -A >/dev/null; G "$P" commit -qm "docs(review): block" >/dev/null
OUT="$(guard "$PRF")"
[ "$(grc "$PRF")" = "2" ] && case "$OUT" in *"says 'block'"*) true ;; *) false ;; esac \
  && ok "a block verdict is refused before CI fails it" || bad "a PR with a block verdict was allowed" "$OUT"
printf '{"verdict":"pass","head":"%s"}\n' "$H11" > "$P/.vantry/reviews/feat-auth.security.json"
G "$P" add -A >/dev/null; G "$P" commit -qm "docs(review): pass" >/dev/null
OUT="$(guard "$PRF")"
[ "$(grc "$PRF")" = "2" ] && case "$OUT" in *"push it first"*) true ;; *) false ;; esac \
  && ok "a pass verdict committed but not pushed is refused: CI reads what was pushed" || bad "a PR on an unpushed verdict was allowed" "$OUT"
G "$P" push -q origin feat-auth >/dev/null 2>&1
[ "$(grc "$PRF")" = "0" ] && ok "a pushed pass verdict and a filled evidence section: the PR may open" || bad "false refusal of a PR CI would pass" "$(guard "$PRF")"
PRI='"gh pr create --base main --title x --body \"## Verification evidence\n- verify.sh passed\""'
[ "$(grc "$PRI")" = "0" ] && ok "an inline body with the evidence section is read as CI reads it" || bad "false refusal of an inline evidence body" "$(guard "$PRI")"
# A `$` elsewhere in the command (here, the title) does not make a literal body
# computed: only the body's own word decides (sixth review, 19 Nov 2026).
PRD='"gh pr edit 1 --title \"costs $5\" --body \"nothing here\""'
OUT="$(guard "$PRD")"
[ "$(grc "$PRD")" = "2" ] && case "$OUT" in *"Verification evidence"*) true ;; *) false ;; esac \
  && ok "a literal body with no evidence is refused although the title holds a \$" || bad "a \$ in the title let an empty body through" "$OUT"
# A body the shell computes is not in the command's text: CI judges it.
for c in "gh pr create --base main --title x --body \\\"\$(cat $WORK/ev-full.md)\\\"" \
         'gh pr create --base main --title x --body \"$BODY\"' \
         "gh pr create --base main --title x --body-file - < $WORK/ev-full.md"; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "a computed body is left to CI, not refused: $c" || bad "false refusal of a computed body: $c" "$(guard "\"$c\"")"
done
echo 'deny by default, changed' > "$P/src/auth/policy.txt"; G "$P" commit -qam "fix(auth): late" >/dev/null
( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
G "$P" push -q origin feat-auth >/dev/null 2>&1
OUT="$(guard "$PRF")"
[ "$(grc "$PRF")" = "2" ] && case "$OUT" in *"changed after the review"*) true ;; *) false ;; esac \
  && ok "a sensitive file changed after its review is refused before CI fails it" || bad "a PR whose review went stale was allowed" "$OUT"

hdr "T11e · every branch a command publishes is judged by its OWN receipt"
# 17 Nov 2026, an adopting repository: eleven refs went out in one push, ten of
# them never verified, and their pull requests failed in CI. The guard judged
# only the branch the agent stood on, by matching the words. It now reads the
# command: each branch it publishes, or opens a PR from, needs its own receipt.
P="$WORK/t11e"; make_project "$P"
R11e="$WORK/t11e-remote.git"
git init -q --bare -b main "$R11e"
G "$P" remote add origin "$R11e"; G "$P" push -q origin main >/dev/null 2>&1
G "$P" remote set-head origin main >/dev/null 2>&1
G "$P" checkout -q -b side
echo 'side' > "$P/src/side.txt"; G "$P" add -A >/dev/null; G "$P" commit -qm "feat: side" >/dev/null
G "$P" checkout -q -b side2 main
echo 'side2' > "$P/src/side2.txt"; G "$P" add -A >/dev/null; G "$P" commit -qm "feat: side2" >/dev/null
SIDE="$(git -C "$P" rev-parse side)"
G "$P" checkout -q -b feat main
echo 'ok, feat' > "$P/src/status.txt"; G "$P" commit -qam "feat: feat" >/dev/null
( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
psrc() { ( cd "$P" && printf '{"tool_name":"PowerShell","tool_input":{"command":%s}}' "$1" | ./.claude/hooks/bash-guard.sh >/dev/null 2>&1 ); echo $?; }
[ "$(grc '"git push origin feat"')" = "0" ] && ok "the verified branch you stand on may be pushed" \
  || bad "a verified push was denied" "$(guard '"git push origin feat"')"
OUT11e="$(guard '"git push origin side"')"
[ "$(grc '"git push origin side"')" = "2" ] && case "$OUT11e" in *"side"*) true ;; *) false ;; esac \
  && ok "pushing ANOTHER, unverified branch from a verified one is denied, by name" \
  || bad "an unverified branch went out from a verified one" "$OUT11e"
OUT11e="$(guard '"git push origin side side2"')"
case "$OUT11e" in *"· side "*"· side2 "*) ok "every unverified branch is named in ONE refusal" ;;
  *) bad "the refusal does not list each branch" "$OUT11e" ;; esac
for c in 'git push origin feat side' 'git push --all origin' 'git push origin s*' \
         'git -C . push origin side' 'git push origin +side' 'git push origin refs/heads/side:refs/heads/side' \
         'git --git-dir=.git push origin side' 'git push origin \\\nside' 'git commit -m x; git push origin side' \
         "bash -c 'git push origin side'"; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "read, not skipped: $c" \
    || bad "an unverified branch slipped through: $c" "$(guard "\"$c\"")"
done
[ "$(psrc '"git push origin `\nside"')" = "2" ] && ok "a PowerShell continuation line is joined before it is read" \
  || bad "PowerShell continuation hid the branch" ""
[ "$(grc "\"git push origin $SIDE:refs/heads/x\"")" = "2" ] && ok "a raw commit no receipt covers is refused" \
  || bad "a raw unverified commit was allowed" "$(guard "\"git push origin $SIDE:refs/heads/x\"")"
for c in 'git push origin feat 2>&1' 'git push origin feat >/dev/null 2>&1' 'git push origin --delete side' \
         'git push origin :side' 'git status' 'git log --oneline -3' 'gh pr list' 'gh pr view 3' \
         'echo \"git push origin side\"' 'git commit -F - <<MSG\nfix: never git push origin side unverified\nMSG'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "not a publication of side: $c" \
    || bad "false positive: $c" "$(guard "\"$c\"")"
done
# Disarming the hooks for ONE command is still disarming them.
HP="core.hooks""Path"; NVA="--no-""verif"
for c in "git -c $HP=/dev/null push origin feat" "git -c alias.p=push p origin feat" \
         "git push $NVA origin feat" 'git commit -n -m x' 'git commit -anm x' 'git commit --amend -n'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a one-command escape is denied: $c" \
    || bad "a one-command escape slipped through: $c" "$(guard "\"$c\"")"
done
for c in 'git commit -mn' 'git commit -m n' 'git -c user.name=x commit -m y'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "not an escape (standard): $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
# An alias hides the subcommand; the guard reads what it expands to.
G "$P" config alias.pp push; G "$P" config alias.ship '!git push origin side'
[ "$(grc '"git pp origin side"')" = "2" ] && ok "a git alias is expanded, and the push it hides judged" \
  || bad "an alias smuggled an unverified push" "$(guard '"git pp origin side"')"
[ "$(grc '"git pp origin feat"')" = "0" ] && ok "…and the same alias on a verified branch passes" \
  || bad "false positive on an alias" "$(guard '"git pp origin feat"')"
[ "$(grc '"git ship"')" = "2" ] && ok "a shell alias is read as the command it runs" \
  || bad "a shell alias smuggled an unverified push" "$(guard '"git ship"')"
# merge.authority: human — a push that lands commits on the deploy branch IS a merge.
for c in 'git push origin feat:main' 'git push origin HEAD:main' 'git push origin HEAD:refs/heads/main'; do
  OUT11e="$(guard "\"$c\"")"
  [ "$(grc "\"$c\"")" = "2" ] && case "$OUT11e" in *"the branch that deploys"*) true ;; *) false ;; esac \
    && ok "a push onto the deploy branch is refused under human merge authority: $c" \
    || bad "a push merged into the deploy branch: $c" "$OUT11e"
done
# …however the source is named: a computed commit, a tag, or a computed
# destination, and when the clone has no origin/HEAD to say which branch deploys.
G "$P" tag t-side side
for c in 'git push origin $(git rev-parse side):refs/heads/main' 'git push origin t-side:refs/heads/main' \
         'git push origin feat:$B'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a push onto the deploy branch is refused: $c" \
    || bad "a push merged into the deploy branch: $c" "$(guard "\"$c\"")"
done
G "$P" remote set-head origin -d >/dev/null 2>&1
[ "$(grc '"git push origin feat:main"')" = "2" ] && ok "with no origin/HEAD, main is still the branch that deploys" \
  || bad "no origin/HEAD let a push onto main through" "$(guard '"git push origin feat:main"')"
G "$P" remote set-head origin main >/dev/null 2>&1
# Pull requests: judged by the branch they are opened FROM, however they are opened.
for c in 'gh pr create --head side --base main --title x --body y' 'gh pr create -H side -B main -t x -b y' \
         'gh pr create --head=side --title x' 'gh api repos/o/r/pulls -f head=side -f base=main -f title=x' \
         'gh -R o/r api --method POST repos/o/r/pulls -F head=side'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a PR from an unverified branch is denied: $c" \
    || bad "a PR from an unverified branch was allowed: $c" "$(guard "\"$c\"")"
done
for c in 'gh pr create --head feat --base main --title x --body y' 'gh api repos/o/r/pulls -f head=feat -f base=main' \
         'gh api repos/o/r/pulls' 'gh api repos/o/r/pulls/1'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "allowed: $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
for c in 'gh api -X PUT repos/o/r/pulls/1/merge' 'gh api --method=put /repos/o/r/pulls/1/merge' \
         'curl -X PUT https://api.github.com/repos/o/r/pulls/1/merge'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a merge through the API is a merge: $c" \
    || bad "an API merge slipped past merge.authority: $c" "$(guard "\"$c\"")"
done
# Security review, 18 Nov 2026: each of these got rc 0. An absolute API URL, the
# branch-merge and ref/contents write routes, GraphQL merges and commits.
for c in 'gh api -X PUT https://api.github.com/repos/o/r/pulls/1/merge' \
         'gh api repos/o/r/merges -f base=main -f head=side' \
         'gh api -X PATCH repos/o/r/git/refs/heads/main -f sha=abc' \
         'gh api -X PUT repos/o/r/contents/a.txt -f branch=main -f content=eA==' \
         "gh api graphql -f query='mutation { mergeBranch(input:{}) { clientMutationId } }'" \
         "gh api graphql -f query='mutation { enqueuePullRequest(input:{}) { clientMutationId } }'" \
         "gh api graphql -f query='mutation { createCommitOnBranch(input:{}) { clientMutationId } }'" \
         'gh pr update-branch 1' 'curl -X POST https://api.github.com/repos/o/r/merges -d x' \
         'curl -X PATCH -d x https://api.github.com/repos/o/r/git/refs/heads/main'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a merge or branch write through the API is refused: $c" \
    || bad "an API write slipped through: $c" "$(guard "\"$c\"")"
done
for c in 'gh api repos/o/r/git/refs/heads/main' 'gh api repos/o/r/contents/README.md' \
         'curl -D h.txt https://api.github.com/repos/o/r/git/refs/heads/main' \
         "gh api graphql -f query='query { viewer { login } }'"; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "an API read passes: $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
# The plumbing under push publishes without running pre-push.
for c in 'git send-pack ../t11e-remote.git side' 'git http-push https://x/r.git side' \
         'git-send-pack ../t11e-remote.git side' '/mingw64/libexec/git-core/git-push origin side'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a publish that skips pre-push is refused: $c" \
    || bad "a publish skipped pre-push: $c" "$(guard "\"$c\"")"
done
# An alias written in the same command, or a subcommand computed when it runs,
# is invisible to the reading: an agent writes no alias, and spells the command.
for c in "gh alias set pm 'pr merge' && gh pm 1" 'gh pr $(printf merge) 1' 'git $(echo push) origin side' \
         'git config alias.p push && git p origin side' 'git config --global alias.p push' \
         'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.p GIT_CONFIG_VALUE_0=push git p origin side' \
         'git -C $(pwd) push origin side'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "refused: $c" || bad "slipped through: $c" "$(guard "\"$c\"")"
done
for c in 'git config --get alias.p' 'git config alias.p' 'git config --get-regexp alias' 'git config user.name x' \
         'man git-send-pack' 'gh pr view $(git branch --show-current)' 'git log $(git merge-base main HEAD)..HEAD'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "allowed: $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
# Security review of this branch, 18 Nov 2026 (findings 2-7): each got rc 0.
# The deploy branch reached by another name, or through where git maps a push;
# push plumbing behind a wrapper with arguments; a computed command word; a
# route split by quotes; HTTPie and xh; renaming, deleting or replacing the
# deploy branch. feat is verified here, so only the route itself is judged.
for c in 'git push origin feat:heads/main' \
         'git -c remote.origin.push=refs/heads/feat:refs/heads/main push origin feat' \
         'git -c push.default=upstream push' 'git branch -u origin/main' \
         'git branch --set-upstream-to=origin/main feat' 'git config push.default upstream' \
         'git config remote.origin.push refs/heads/feat:refs/heads/main' \
         'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=push.default GIT_CONFIG_VALUE_0=upstream git push' \
         'timeout 60 git-send-pack ../t11e-remote.git side' 'nice -n 5 git-push origin side' \
         'stdbuf -o0 git-send-pack ../r.git side' 'echo side | xargs git-send-pack ../r.git' \
         '$(echo gh) pr merge 1' '\"$(command -v gh)\" pr merge 1' '$G push origin feat' \
         "curl -X PUT https://api.github.com/repos/o/r/pu''lls/1/merge" \
         "curl -X POST https://api.github.com/repos/o/r/mer''ges -d x" \
         "gh api graphql -f query='mutation { merge''Branch(input:{}) { clientMutationId } }'" \
         'https PUT api.github.com/repos/o/r/pulls/1/merge' 'xh PUT https://api.github.com/repos/o/r/pulls/1/merge' \
         'gh api -X POST repos/o/r/branches/main/rename -f new_name=old' \
         'gh api -X DELETE repos/o/r/git/refs/heads/main' \
         "gh api graphql -f query='mutation { deleteRef(input:{}) { clientMutationId } }'" \
         'git push origin :main' 'git push origin --delete main' 'git push -d origin refs/heads/main' \
         'gh api -X PATCH repos/o/r -f default_branch=side' 'gh repo edit --default-branch side' \
         'curl -X PATCH -d default_branch=side https://api.github.com/repos/o/r' \
         'curl -X POST -d new_name=x https://api.github.com/repos/o/r/branches/main/rename'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "refused (review route): $c" || bad "slipped through: $c" "$(guard "\"$c\"")"
done
# …and a branch mapped onto main in the repository's own config is judged where it lands.
G "$P" config remote.origin.push refs/heads/feat:refs/heads/main
for c in 'git push' 'git push origin' 'git push origin feat'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "a push mapped onto the deploy branch by remote.origin.push is refused: $c" \
    || bad "a mapped push merged into the deploy branch: $c" "$(guard "\"$c\"")"
done
G "$P" config --unset remote.origin.push
G "$P" config push.default upstream; G "$P" config branch.feat.remote origin; G "$P" config branch.feat.merge refs/heads/main
[ "$(grc '"git push"')" = "2" ] && ok "a bare push onto an upstream of main (push.default=upstream) is refused" \
  || bad "push.default=upstream merged into the deploy branch" "$(guard '"git push"')"
G "$P" config --unset push.default; G "$P" config --unset branch.feat.remote; G "$P" config --unset branch.feat.merge
# The third review: a push that names no branch after a switch in the same
# command, config the guard never reads (an include, a config file named for one
# command), refspecs read from stdin, and the remote's HEAD or a push mirror
# written by an agent.
for c in 'git checkout main && git merge --ff-only feat && git push' 'git switch main && git push origin' \
         'git checkout main; git push origin HEAD' 'git -c include.path=../evil push origin feat' \
         'git config include.path ../evil' 'git config includeIf.gitdir:/x/.path ../evil' \
         'GIT_CONFIG_GLOBAL=../evil git push origin feat' 'echo feat:main | xargs git push origin' \
         'printf 1 | xargs -n1 gh pr merge' 'git remote set-head origin side' \
         'git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/side' \
         'git remote add --mirror=push backup ../r.git'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "refused (third review): $c" || bad "slipped through: $c" "$(guard "\"$c\"")"
done
for c in 'git checkout -- src/status.txt && git push' 'git push origin feat && git checkout main' \
         'git checkout main && git push origin feat' 'git remote set-head origin -a' \
         'git symbolic-ref refs/remotes/origin/HEAD' 'git config --get include.path' \
         'git ls-files | xargs grep -l TODO' 'git remote add backup ../r.git'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "allowed: $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
# The fixes for the fourth review: the hooks' probe variable, a switch or a move
# out of this repository the guard missed, and a hook rewritten by the shell.
for c in 'VANTRY_HOOK_PROBE=1 git push origin feat' 'export VANTRY_HOOK_PROBE=1' \
         'git checkout main -- && git push' 'git rebase main side && git push' \
         'git rebase --root side && git push origin HEAD' 'cd .. && git push' 'cd /tmp && git push origin' \
         'pushd .. && git push' 'git -C .. push' 'git --git-dir=../x/.git push' 'GIT_DIR=../x/.git git push' \
         'printf x > .githooks/pre-push && git push origin feat' 'chmod -x .githooks/pre-push' \
         'sed -i s/a/b/ .claude/hooks/bash-guard.sh' 'mv /tmp/x .githooks/pre-push' \
         'truncate -s0 scripts/verify.sh' 'echo exit >> scripts/lib/vantry-common.sh'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "refused (fourth review): $c" || bad "slipped through: $c" "$(guard "\"$c\"")"
done
[ "$(psrc '"$env:VANTRY_HOOK_PROBE=1; git push origin feat"')" = "2" ] && ok "refused in PowerShell: \$env:VANTRY_HOOK_PROBE" \
  || bad "PowerShell set the hook probe" ""
# The fifth review: a cd read only as a command's first word (`{ … }`, `if`),
# `env -C`, a redirect read as a file after `--`, HEAD moved by symbolic-ref,
# and a copy, link, dd or mode change whose target is the machinery.
for c in '{ cd ../x; git push; }' 'if cd ../x; then git push; fi' 'env -C ../x git push' \
         'env --chdir=../x git push' 'git checkout main -- 2>/dev/null && git push' \
         'git checkout main -- 2> /dev/null && git push' 'git symbolic-ref HEAD refs/heads/main && git push' \
         'cp /tmp/x .githooks/pre-push' 'cp /tmp/x .githooks/pre-push -f' 'cp -t .githooks /tmp/x' \
         'ln -sf /tmp/x .githooks/pre-push' 'chmod 644 .githooks/pre-push' 'dd if=/tmp/x of=scripts/verify.sh'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "refused (fifth review): $c" || bad "slipped through: $c" "$(guard "\"$c\"")"
done
for c in '{ cd src; git push; }' 'env -C src git push' 'git symbolic-ref --short HEAD && git push' \
         'cp scripts/lib/vantry-common.sh /tmp/fx/x' 'cp -r .githooks /tmp/fx/' \
         'chmod +x scripts/lib/new-helper.sh' 'chmod u+x .githooks/pre-push'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "allowed: $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
# The sixth review: a copy whose destination is a directory the machinery lives
# in (or the tree's root, from a source named like it), a target named by a
# cluster, an abbreviation or PowerShell's -Destination, a redirect read as an
# operand, every destination when several are named, a mode taken from a file
# or written as digits, and env options before -C.
for c in 'cp -r /tmp/fx/.githooks .' 'cp -r /tmp/fx/.githooks ./' 'cp -r /tmp/fx/.claude/hooks .claude/' \
         'cp /tmp/fx/scripts/verify.sh scripts/' 'rsync -a /tmp/fx/.githooks .' 'cp -r /tmp/fx/scripts .' \
         'cp -r /tmp/fx/lib scripts' 'cp -vt .githooks/ /tmp/x' 'cp -ft .githooks /tmp/x' \
         'ln -sft .githooks /tmp/x' 'install -Dt .githooks /tmp/x' 'cp --target=.githooks /tmp/x' \
         'cp --target .githooks /tmp/x' 'install /tmp/x .githooks/pre-push -m 755' \
         'cp /tmp/x .githooks/pre-push -S .bak' 'cp /tmp/x .githooks/pre-push --suffix .bak' \
         'cp /tmp/x .githooks/pre-push <<< x' 'cp /tmp/x .githooks/pre-push 10>/dev/null' \
         'Copy-Item -Dest .githooks/pre-push -Path /tmp/x' 'cp -Dest .githooks/pre-push -Path /tmp/x' \
         'ln -s /tmp/fx/.githooks' 'cp -r /tmp/fx/* .' 'rsync -a /tmp/fx/ ./' 'mv /tmp/fx/scripts .' \
         'chmod 0 .githooks/pre-push' 'chmod 44 .githooks/pre-push' 'chmod 00644 .githooks/pre-push' \
         'chmod +x,-x .githooks/pre-push' 'chmod a+r,a-x .githooks/pre-push' 'chmod u+x-x .githooks/pre-push' \
         'chmod --reference=README.md .githooks/pre-push' 'env -u FOO -C ../x git push' \
         'env -v -C ../x git push' 'env -vC ../x git push' 'env --debug --chdir=../x git push' \
         'env -i -C ../x git push' 'env --chd ../x git push' 'function f { cd ../x; }; f; git push' \
         'git checkout main -- 10>/dev/null && git push' 'git checkout main -- <<< x && git push' \
         'git symbolic-ref 10>/dev/null HEAD refs/heads/main && git push'; do
  [ "$(grc "\"$c\"")" = "2" ] && ok "refused (sixth review): $c" || bad "slipped through: $c" "$(guard "\"$c\"")"
done
for c in 'sc .githooks/pre-push x' 'ni -Force .githooks/pre-push' 'copy /tmp/x .githooks/pre-push' \
         'Copy-Item /tmp/fx/.githooks . -Recurse'; do
  [ "$(psrc "\"$c\"")" = "2" ] && ok "refused in PowerShell (sixth review): $c" || bad "PowerShell slipped through: $c" ""
done
for c in 'cp -t /tmp/fx .githooks/pre-push' 'cp src/a.ts src/b.ts' 'ln -s ../.githooks/pre-push /tmp/fx/link' \
         'chmod -R +x .githooks' 'chmod +x,u+w scripts/lib/new-helper.sh' 'grep -n del scripts/lib/vantry-common.sh' \
         'grep -n install scripts/lib/vantry-common.sh' 'env -u FOO -C src git push' 'env -v git push' \
         'rsync -av src/ /tmp/fx/' 'Copy-Item -Path .githooks/pre-push -Destination /tmp/fx/x' 'cp -r src/x ./'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "allowed: $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
for c in 'git checkout main -- src/status.txt && git push' 'cd src && git push' 'git -C . push' \
         'cd . && git push origin feat' 'git rebase main && git push' 'cat .githooks/pre-push > out.txt' \
         'sed -n 1,5p .githooks/pre-push' 'git checkout -- .githooks/pre-push' \
         'shellcheck .claude/hooks/bash-guard.sh' 'git update-index --chmod=+x .githooks/pre-push' \
         'scripts/lib/enable-hooks.sh --status .' 'grep -n VANTRY_HOOK_PROBE .githooks/pre-push'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "allowed: $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
for c in 'git push origin --delete side' 'git push origin :side' 'git push -u origin feat' 'git push origin feat' \
         'git checkout -b x origin/main' 'git branch -u origin/feat' 'git config --get push.default' \
         'timeout 60 git status' 'echo git-push' 'which git-send-pack' 'gh api repos/o/r' \
         'gh api repos/o/r/branches/main' 'gh repo edit --description x' '$EDITOR notes.txt' \
         'curl https://api.github.com/repos/o/r'; do
  [ "$(grc "\"$c\"")" = "0" ] && ok "allowed: $c" || bad "false positive: $c" "$(guard "\"$c\"")"
done
if command -v gh >/dev/null 2>&1 && GH_CONFIG_DIR="$WORK/ghcfg" gh alias set pm 'pr merge' >/dev/null 2>&1; then
  RCPM=$( ( cd "$P" && export GH_CONFIG_DIR="$WORK/ghcfg" && printf '{"tool_name":"Bash","tool_input":{"command":"gh pm 1"}}' | ./.claude/hooks/bash-guard.sh >/dev/null 2>&1 ); echo $? )
  [ "$RCPM" = "2" ] && ok "a gh alias of pr merge is a merge" || bad "a gh alias smuggled a merge" "rc=$RCPM"
else
  echo "  - no usable gh here: the gh-alias case is not exercised"
fi
# The base reaches git fetch as an argument: one that reads as an option never does.
G "$P" update-ref refs/remotes/origin/gone "$SIDE"
grc '"gh pr create --base --prune --title x"' >/dev/null
git -C "$P" rev-parse -q --verify refs/remotes/origin/gone >/dev/null 2>&1 \
  && ok "an option-shaped --base is never handed to git fetch (--prune did not run)" \
  || bad "the --base value reached git fetch as an option" ""
# Receipts are kept per working tree: the refusal says where a branch can be verified.
G "$P" worktree add -q "$WORK/t11e-wt" side2 >/dev/null 2>&1
case "$(guard '"git push origin side2"')" in *"checked out at"*) ok "a branch checked out in another worktree is named there" ;;
  *) bad "no worktree hint" "$(guard '"git push origin side2"')" ;; esac
# …and once each branch IS verified, the same commands pass.
G "$P" checkout -q side; ( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1; G "$P" checkout -q feat
[ "$(grc '"git push origin feat side"')" = "0" ] && ok "once verified on its own branch, it goes out from anywhere" \
  || bad "the per-branch gate cannot be satisfied" "$(guard '"git push origin feat side"')"
[ "$(grc '"gh pr create --head side --base main --title x"')" = "0" ] && ok "…and a PR from it may open" \
  || bad "a PR from a verified branch was denied" "$(guard '"gh pr create --head side --base main --title x"')"

hdr "T12 · hooks never crash on junk input"
for h in verify-gate bash-guard log-tool session-start; do
  RC=$( ( cd "$P" && printf 'not json at all' | "./.claude/hooks/$h.sh" >/dev/null 2>&1 ); echo $? )
  [ "$RC" -le 2 ] && ok "$h survives malformed stdin (rc=$RC)" || bad "$h crashed" "rc=$RC"
done
RC=$( ( cd "$WORK" && printf '{}' | "$P/.claude/hooks/verify-gate.sh" >/dev/null 2>&1 ); echo $? )
[ "$RC" = "0" ] && ok "hooks stay out of a directory with no contract" || bad "fired outside a project" "rc=$RC"

hdr "T13 · SessionStart reports real state, not memory"
P="$WORK/t13"; make_project "$P"
echo '// unverified' > "$P/src/new.ts"
OUT="$( cd "$P" && printf '{}' | ./.claude/hooks/session-start.sh 2>&1 )"
case "$OUT" in *"none for this branch"*) ok "an unverified branch is announced" ;; *) bad "no verification state" "$OUT" ;; esac
# #10: the banner counted with `grep -c .` in the caller's locale and announced
# 0 when every changed name was invalid UTF-8; it must use the gates' own count.
case "$OUT" in *"- 1 non-trivial file(s) changed"*) ok "the banner counts the change" ;; *) bad "wrong change count in the banner" "$OUT" ;; esac
grep -q 'n="$(vantry_changed_count)"' "$P/.claude/hooks/session-start.sh" && ! grep -v '^[[:space:]]*#' "$P/.claude/hooks/session-start.sh" | grep -q 'grep -c' \
  && ok "and it is the count the gates use (vantry_changed_count), not a locale-dependent grep" \
  || bad "the banner still counts on its own" "$(grep -n 'n=' "$P/.claude/hooks/session-start.sh")"
( cd "$P" && ./scripts/verify.sh ) >/dev/null 2>&1
OUT="$( cd "$P" && printf '{}' | ./.claude/hooks/session-start.sh 2>&1 )"
case "$OUT" in *"current for this code"*) ok "a fresh receipt is announced" ;; *) bad "fresh state not reported" "$OUT" ;; esac
echo '// changed again' >> "$P/src/new.ts"
OUT="$( cd "$P" && printf '{}' | ./.claude/hooks/session-start.sh 2>&1 )"
case "$OUT" in *STALE*) ok "staleness is announced after compaction" ;; *) bad "stale state not reported" "$OUT" ;; esac

hdr "T14 · pre-push gates the refs being PUSHED, not the branch you stand on"
# It never read stdin, so a verified `main` let an unverified `feat/y` out with
# exit 0 and not a word. `git push --all` and any /next fan-out from trunk
# defeated it the same way.
P14="$WORK/t14push"; make_project "$P14"
( cd "$P14" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
git init -q --bare "$WORK/t14-remote.git"
git -C "$P14" remote add origin "$WORK/t14-remote.git"
G "$P14" push -q origin main >/dev/null 2>&1
( cd "$P14" && ./scripts/verify.sh ) >/dev/null 2>&1
G "$P14" push -q origin main >/dev/null 2>&1
git -C "$P14" checkout -qb feat/unverified
echo '// unverified' > "$P14/src/new.ts"
G "$P14" add -A >/dev/null; G "$P14" commit -qm "feat: unverified" >/dev/null 2>&1
git -C "$P14" checkout -q main
OUT="$(G "$P14" push origin feat/unverified 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "an unverified branch pushed FROM main is refused" \
  || bad "unverified branch went out while standing on main" "$OUT"
case "$OUT" in *"PUSH REFUSED"*) ok "and it says why" ;; *) bad "no refusal banner" "$OUT" ;; esac
# The tag case is tested with the standing branch DELIBERATELY stale, because
# that is the case that fell through: a tag-only push carries no changeset, but
# an earlier version gated whatever branch you were standing on and refused.
printf 'stale\n' > "$P14/src/status.txt"          # deliberately stale standing branch
# Create the tag through the identity-carrying helper, and ASSERT it exists
# before pushing. An annotated tag needs a tagger identity; on a CI runner git
# often cannot auto-detect one and refuses. The first version used bare `git`
# with the error swallowed, so the push then failed with "src refspec t14 does
# not match any" — a message about the hook that had nothing to do with the hook.
G "$P14" tag t14 >/dev/null 2>&1
if ! git -C "$P14" rev-parse -q --verify refs/tags/t14 >/dev/null 2>&1; then
  bad "the fixture could not create a tag at all — this says nothing about pre-push" "$(G "$P14" tag t14 2>&1 | head -2)"
else
  G "$P14" push -q origin refs/tags/t14 >/dev/null 2>&1 && ok "a tag is not blocked, even with the standing branch stale" \
    || bad "tag push blocked — 'only tags' is being confused with 'no stdin'" "$(G "$P14" push origin refs/tags/t14 2>&1 | head -4)"
fi
git -C "$P14" checkout -q -- src/status.txt
git -C "$P14" checkout -q feat/unverified
( cd "$P14" && ./scripts/verify.sh ) >/dev/null 2>&1
git -C "$P14" checkout -q main
G "$P14" push -q origin feat/unverified >/dev/null 2>&1 \
  && ok "once verified it goes out — the ref gate is satisfiable" \
  || bad "still refused after a real verification" "$(G "$P14" push origin feat/unverified 2>&1)"
# Neither a branch nor a tag — a raw commit, or HEAD — fell through and did
# nothing: `git push origin <sha>:refs/heads/x` published unverified work.
git -C "$P14" checkout -qb t14-raw
echo '// raw' > "$P14/src/raw.ts"; G "$P14" add -A >/dev/null; G "$P14" commit -qm "feat: raw" >/dev/null 2>&1
RAW14="$(git -C "$P14" rev-parse HEAD)"
OUT="$(G "$P14" push origin HEAD:refs/heads/raw-head 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "HEAD pushed by a refspec is judged by its branch's receipt" || bad "an unverified HEAD went out" "$OUT"
git -C "$P14" checkout -q main
OUT="$(G "$P14" push origin "$RAW14:refs/heads/raw" 2>&1)"; RC=$?
[ "$RC" != "0" ] && case "$OUT" in *"is not a branch"*) true ;; *) false ;; esac \
  && ok "a raw commit no branch has verified is refused, and told to push its branch" \
  || bad "a raw unverified commit went out" "$OUT"
G "$P14" push -q origin "$(git -C "$P14" rev-parse main):refs/heads/main-copy" >/dev/null 2>&1 \
  && ok "a raw commit already on the trunk is not refused" \
  || bad "a published commit was refused" "$(G "$P14" push origin "$(git -C "$P14" rev-parse main):refs/heads/main-copy2" 2>&1)"
# The branch that deploys. Under merge.authority: human a push that MOVES it is
# a merge. The guard judges a command's text before it runs, so
# `git checkout main && git merge --ff-only feat && git push` got past it (a
# security review reproduced it). This hook sees the destination git resolved.
# feat/unverified is verified by now, so only the deploy rule can refuse it.
R14="$WORK/t14-remote.git"
main14="$(git --git-dir="$R14" rev-parse main)"
OUT="$(G "$P14" push origin feat/unverified:main 2>&1)"; RC=$?
[ "$RC" != "0" ] && case "$OUT" in *"the branch that deploys"*) true ;; *) false ;; esac \
  && ok "a verified fast-forward onto main is refused: under merge.authority human it is a merge" \
  || bad "pre-push let a push move the branch that deploys" "$OUT"
# The reachability probe's variable around a real push skips nothing (a security
# review: VANTRY_HOOK_PROBE=1 used to make every hook exit 0 before its check).
OUT="$( export VANTRY_HOOK_PROBE=1; G "$P14" push origin feat/unverified:main 2>&1 )"; RC=$?
[ "$RC" != "0" ] && [ "$(git --git-dir="$R14" rev-parse main)" = "$main14" ] \
  && ok "VANTRY_HOOK_PROBE=1 around a push skips nothing: still refused" \
  || bad "the hooks' probe variable let a push move main" "$OUT"
G "$P14" merge -q --ff-only feat/unverified >/dev/null 2>&1
( cd "$P14" && ./scripts/verify.sh ) >/dev/null 2>&1
OUT="$(G "$P14" push origin main 2>&1)"; RC=$?
[ "$RC" != "0" ] && [ "$(git --git-dir="$R14" rev-parse main)" = "$main14" ] \
  && ok "main fast-forwarded and verified locally, then pushed: refused, and remote main did not move" \
  || bad "the reviewer's one-command route moved remote main" "$OUT"
for c in ':main' '--delete main'; do
  # $c is split into words on purpose: a refspec, or an option and a name
  OUT="$(G "$P14" push origin $c 2>&1)"; RC=$?
  [ "$RC" != "0" ] && [ "$(git --git-dir="$R14" rev-parse -q --verify main)" = "$main14" ] \
    && ok "deleting the branch that deploys is refused: push origin $c" \
    || bad "push origin $c deleted the branch that deploys" "$OUT"
done
G "$P14" push -q origin "$main14:refs/heads/main" >/dev/null 2>&1 \
  && ok "a push that leaves main where it is passes" \
  || bad "a push that changes nothing was refused" "$(G "$P14" push origin "$main14:refs/heads/main" 2>&1)"
git init -q --bare "$WORK/t14-fresh.git"
G "$P14" push -q "$WORK/t14-fresh.git" main >/dev/null 2>&1 \
  && ok "creating main on an empty remote (a first push) passes" \
  || bad "a first push of main was refused" "$(G "$P14" push "$WORK/t14-fresh.git" main 2>&1)"
( export VANTRY_SKIP_GATE=1; G "$P14" push -q origin main ) >/dev/null 2>&1
[ "$(git --git-dir="$R14" rev-parse main)" = "$(git -C "$P14" rev-parse main)" ] \
  && ok "VANTRY_SKIP_GATE=1, a person's emergency lever, still moves it" \
  || bad "the emergency lever no longer works" ""
if ( export VANTRY_HOOK_PROBE=1; G "$P14" commit --allow-empty -qm "not conventional" ) >/dev/null 2>&1; then
  bad "VANTRY_HOOK_PROBE=1 let a non-conventional commit through" ""
else
  ok "VANTRY_HOOK_PROBE=1 around a commit skips nothing: commit-msg still refuses"
fi
ST14="$( cd "$P14" && ./scripts/lib/enable-hooks.sh --status . 2>&1 )"
case "$ST14" in *"pre-push : ACTIVE"*) ok "and the probe's own call still reaches the hooks (--status)" ;;
  *) bad "the reachability probe no longer reaches pre-push" "$ST14" ;; esac

hdr "T15 · a secret scanner that finds nothing must not weaken the gate"
# The secret scan was an if/ELSE: when gitleaks was installed, the built-in scan
# was skipped entirely. gitleaks 8.19 removed `protect`, and on 8.30 the command
# reported "0 commits scanned … no leaks found" and exited 0 — so a staged AWS
# key committed cleanly on a machine WITH gitleaks and was refused on one
# without. A gate whose strength depends on your PATH is not a gate.
P15="$WORK/t15leak"; make_project "$P15"
( cd "$P15" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
FAKEBIN="$WORK/t15-bin"; mkdir -p "$FAKEBIN"
cat > "$FAKEBIN/gitleaks" <<'FAKE'
#!/usr/bin/env bash
echo "INF 0 commits scanned."
echo "INF no leaks found"
exit 0
FAKE
chmod +x "$FAKEBIN/gitleaks"
printf 'title = "x"\n' > "$P15/.gitleaks.toml"      # the config the hook looks for
G "$P15" add -A >/dev/null; G "$P15" commit -qm "chore: scanner config" >/dev/null 2>&1
printf 'const k = "AKIA%s";\n' "J7QF2M4XZ9WD3PLK" > "$P15/leak.ts"
G "$P15" add -A >/dev/null
OUT15="$(PATH="$FAKEBIN:$PATH" G "$P15" commit -m "feat: key" 2>&1)"; RC15=$?
[ "$RC15" != "0" ] && ok "a staged AWS key is REFUSED even when gitleaks says 'no leaks found'" \
  || bad "the blind scanner disabled the built-in floor — the gate depends on what is on your PATH" "$OUT15"
case "$OUT15" in *"COMMIT REFUSED"*) ok "and the built-in floor is what refused it" ;;
  *) bad "refused for some other reason" "$OUT15" ;; esac
# The refusal used to advise `git commit --no-verify`, which the agent guard
# denies and which skips every other hook too: a dead end for an agent and a
# blanket bypass for a human. The way out is a visible, per-line marker.
case "$OUT15" in *"git commit --no-verify"*) bad "the refusal still recommends --no-verify" "$OUT15" ;;
  *) ok "the refusal never recommends --no-verify" ;; esac
printf 'const k = "AKIA%s"; // gitleaks:allow\n' "J7QF2M4XZ9WD3PLK" > "$P15/leak.ts"
G "$P15" add -A >/dev/null
OUT15b="$(PATH="$FAKEBIN:$PATH" G "$P15" commit -m "test: a reviewed false positive" 2>&1)"; RC15b=$?
if [ "$RC15b" = "0" ]; then
  ok "a line marked gitleaks:allow passes the floor, as it passes gitleaks"
  G "$P15" reset -q --hard HEAD~1 >/dev/null 2>&1
else
  bad "the floor ignores the inline marker gitleaks honours" "$OUT15b"
fi
printf 'const k = "AKIA%s";\n' "J7QF2M4XZ9WD3PLK" > "$P15/leak.ts"
printf '// gitleaks:allow is on another line, not this one\n' >> "$P15/leak.ts"
G "$P15" add -A >/dev/null
PATH="$FAKEBIN:$PATH" G "$P15" commit -qm "feat: key" >/dev/null 2>&1 \
  && bad "a marker elsewhere in the file excused an unmarked secret" "" \
  || ok "the marker excuses only its own line"
rm -f "$P15/leak.ts"; G "$P15" reset -q >/dev/null

hdr "T16 · a leftover green light is impossible to miss"
# /autopilot sets merge.authority: agent for the duration of a run and restores
# it at step 5. A run that dies in between leaves agents able to merge, and
# nothing used to say so. Autonomy must not outlive the run it was granted.
P16="$WORK/t16auto"; make_project "$P16"
mkdir -p "$P16/.vantry"
printf '{ "granted_at": "2026-01-01T00:00:00Z", "granted_by": "issa", "scope": "sprint 1", "merge_authority_before": "human" }\n' > "$P16/.vantry/autopilot.json"
OUT16="$( cd "$P16" && bash "$KIT/.claude/hooks/session-start.sh" 2>&1 )"
case "$OUT16" in *"AUTOPILOT IS ACTIVE"*) ok "the session hook announces an active autopilot" ;;
  *) bad "a green light was left on and nothing said so" "$OUT16" ;; esac
case "$OUT16" in *"leftover state"*) ok "...and says what to do if no run is in progress" ;;
  *) bad "announced it without saying how to clear it" "$OUT16" ;; esac

# and the contract check catches agent-merges that nobody granted
rm -f "$P16/.vantry/autopilot.json"
sed -i.bak 's/^  authority: human/  authority: agent/' "$P16/vantry.yml" 2>/dev/null
rm -f "$P16/vantry.yml.bak"
grep -q 'authority: agent' "$P16/vantry.yml" || printf 'merge:\n  authority: agent\n' >> "$P16/vantry.yml"
OUT16B="$( cd "$P16" && bash "$KIT/scripts/validate-config.sh" 2>&1 )"
case "$OUT16B" in *"records who granted it"*) ok "validate-config warns when agents may merge and nobody granted it" ;;
  *) bad "an unexplained agent-merge setting passed silently" "$OUT16B" ;; esac

hdr "T17 · a tag that publishes unverified work is refused"
# `refs/tags/*) : ;;` skipped every tag on the grounds that "a tag carries no
# changeset". True only when its commit is already on the trunk: `git tag v1
# <unpushed-sha> && git push origin v1` publishes that commit, and in this kit a
# v-tag is what /release acts on.
P17="$WORK/t17tag"; make_project "$P17"
( cd "$P17" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
git init -q --bare "$WORK/t17-remote.git"
git -C "$P17" remote add origin "$WORK/t17-remote.git"
( cd "$P17" && ./scripts/verify.sh ) >/dev/null 2>&1
G "$P17" push -q origin main >/dev/null 2>&1

# (a) a tag on already-published history costs nothing
G "$P17" tag v1.0.0 >/dev/null 2>&1
G "$P17" push -q origin v1.0.0 >/dev/null 2>&1 \
  && ok "a tag on a commit already on the trunk is not gated" \
  || bad "a harmless tag was refused" "$(G "$P17" push origin v1.0.0 2>&1 | head -3)"

# (b) a tag on an unpushed, unverified commit IS gated
echo '// unverified' >> "$P17/src/status.txt"
G "$P17" add -A >/dev/null; G "$P17" commit -qm "feat: unverified" >/dev/null 2>&1
G "$P17" tag v2.0.0 >/dev/null 2>&1
OUT17="$(G "$P17" push origin v2.0.0 2>&1)"; RC17=$?
[ "$RC17" != "0" ] && ok "a tag publishing an unverified commit is REFUSED" \
  || bad "a tag published a commit nothing verified" "$OUT17"
case "$OUT17" in *"NOT on origin"*) ok "and it names what it noticed" ;;
  *) bad "refused without saying why" "$OUT17" ;; esac

# (c) and it stays satisfiable — verify, then the same tag goes out
( cd "$P17" && ./scripts/verify.sh ) >/dev/null 2>&1
G "$P17" push -q origin v2.0.0 >/dev/null 2>&1 \
  && ok "once the commit is verified the tag goes out — the gate is satisfiable" \
  || bad "the tag gate cannot be satisfied" "$(G "$P17" push origin v2.0.0 2>&1 | head -4)"

hdr "T18 · a filename cannot smuggle a secret past the scan"
# `for f in $STAGED` split on whitespace, so `src/my config.ts` became two paths
# that do not exist and was skipped — a credential escaped the one check that
# exists to stop it, by being in a file with a space in its name. The .env
# guard had the same shape and only fired when the .env was the LAST staged path.
P18="$WORK/t18names"; make_project "$P18"
( cd "$P18" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
mkdir -p "$P18/src"

printf 'const k = "AKIA%s";\n' "J7QF2M4XZ9WD3PLK" > "$P18/src/normal.ts"
G "$P18" add -A >/dev/null
G "$P18" commit -qm "feat: normal" >/dev/null 2>&1 \
  && bad "a plain filename let a key through" "" || ok "a key in a normal filename is refused"
G "$P18" reset -q >/dev/null; rm -f "$P18/src/normal.ts"

printf 'const k = "AKIA%s";\n' "J7QF2M4XZ9WD3PLK" > "$P18/src/my config.ts"
G "$P18" add -A >/dev/null
G "$P18" commit -qm "feat: spaced" >/dev/null 2>&1 \
  && bad "a filename with a space smuggled a key past the scan" "$(G "$P18" log -1 --name-only)" \
  || ok "the same key in 'my config.ts' is refused too"
G "$P18" reset -q >/dev/null; rm -f "$P18/src/my config.ts"

printf 'SECRET=x\n' > "$P18/.env"
printf 'y\n' > "$P18/zzz-sorts-last.txt"
G "$P18" add -A >/dev/null
G "$P18" commit -qm "chore: env" >/dev/null 2>&1 \
  && bad "an .env committed because it was not the last staged path" "" \
  || ok "an .env is refused wherever it sits in the staged list"
G "$P18" reset -q >/dev/null; rm -f "$P18/.env" "$P18/zzz-sorts-last.txt"

printf 'API_KEY=<your-key-here>\n' > "$P18/.env.example"
G "$P18" add -A >/dev/null
G "$P18" commit -qm "docs: env example" >/dev/null 2>&1 \
  && ok "…but .env.example is still allowed (the guard is not a wall)" \
  || bad ".env.example was refused — this will get the hook uninstalled" "$(G "$P18" commit -m x 2>&1 | head -3)"

hdr "T19 · a release tag must agree with the VERSION file"
# v3.17.0 through v3.21.1 were all tagged while VERSION still said 3.19.0. Every
# adopter's manifest therefore recorded the wrong kit version, and the README pin
# — derived from VERSION — froze three releases behind, so `git clone --branch`
# in the quickstart handed people an old kit.
#
# The cause was mundane and is worth writing down: a compound command that wrote
# VERSION was refused by a guard, so NOTHING in it ran, and only the verify step
# was re-run afterwards. A human does not notice that. A check does.
P19="$WORK/t19ver"; make_project "$P19"
( cd "$P19" && ./scripts/lib/enable-hooks.sh . ) >/dev/null 2>&1
git init -q --bare "$WORK/t19-remote.git"
git -C "$P19" remote add origin "$WORK/t19-remote.git"
printf '3.0.0\n' > "$P19/VERSION"
G "$P19" add -A >/dev/null; G "$P19" commit -qm "chore: version" >/dev/null 2>&1
( cd "$P19" && ./scripts/verify.sh ) >/dev/null 2>&1
G "$P19" push -q origin main >/dev/null 2>&1

G "$P19" tag v3.9.9 >/dev/null 2>&1
OUT19="$(G "$P19" push origin v3.9.9 2>&1)"; RC19=$?
[ "$RC19" != "0" ] && ok "a tag that disagrees with VERSION is refused" \
  || bad "v3.9.9 shipped while VERSION said 3.0.0" "$OUT19"
case "$OUT19" in *"does not match the VERSION file"*) ok "…and it names both numbers" ;;
  *) bad "refused without saying what disagreed" "$OUT19" ;; esac

G "$P19" tag v3.0.0 >/dev/null 2>&1
G "$P19" push -q origin refs/tags/v3.0.0 >/dev/null 2>&1 \
  && ok "and the matching tag goes out — the check is not a wall" \
  || bad "a correct tag was refused" "$(G "$P19" push origin refs/tags/v3.0.0 2>&1 | head -4)"

echo
echo "=============================================================="
printf " RESULT: %d passed, %d failed\n" "$PASS" "$FAIL"
echo "=============================================================="
rm -rf "$WORK"
[ "$FAIL" -eq 0 ] || exit 1
