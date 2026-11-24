#!/usr/bin/env bash
# ============================================================================
#  test-detach.sh — proves scripts/detach.sh starts a command that runs on its
#  own: the launcher returns before the command ends, the command sees the
#  caller's environment and directory, and its exit code reaches the log.
#  Usage: bash scripts/test/test-detach.sh [kit-path]
# ============================================================================
set -uo pipefail
KIT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
KIT="$(cd "$KIT" && pwd)"
WORK="$(mktemp -d)"
# A private TMPDIR, so the leftover check below counts only the launches made
# HERE. It used to count every vantry-detach.* on the machine — and verify.sh
# started through detach.sh (the recommended way on Windows) owns one for its
# whole run, so this suite failed every verification launched that way.
export TMPDIR="$WORK/tmp"; mkdir -p "$TMPDIR"
PASS=0; FAIL=0
ok()  { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; [ -n "${2:-}" ] && echo "$2" | sed 's/^/        /' | head -12; FAIL=$((FAIL + 1)); }
# Wait up to $2 wall seconds for the log $1 to record the command's exit.
wait_exit() { local e=$((SECONDS + $2)); while [ "$SECONDS" -lt "$e" ]; do grep -q '^detach-exit=' "$1" 2>/dev/null && return 0; sleep 1; done; return 1; }

echo; echo "── detach.sh ──────────────────────────────────────────────"

"$KIT/scripts/detach.sh" >/dev/null 2>&1; [ $? -eq 2 ] && ok "no command is a usage error (exit 2)" || bad "a missing command was accepted" ""

mkdir -p "$WORK/cwd dir"
LOG1="$WORK/one.log"
T0=$SECONDS
PID="$(cd "$WORK/cwd dir" && DETACH_T_VAR="a b'c" "$KIT/scripts/detach.sh" "$LOG1" bash -c 'echo "var=$DETACH_T_VAR"; echo "cwd=$PWD"; sleep 10; echo late')"
RC=$?; EL=$((SECONDS - T0))
[ "$RC" -eq 0 ] && [ -n "$PID" ] && ok "the launcher printed a PID ($PID)" || bad "the launcher failed (rc=$RC)" "$PID"
[ "$EL" -lt 10 ] && ok "and returned in ${EL}s, before the 10s command ended" || bad "the launcher waited for the command (${EL}s)" ""
if wait_exit "$LOG1" 40; then
  grep -q "^var=a b'c\$" "$LOG1" && ok "the command saw the caller's environment, quoting intact" || bad "the environment was lost" "$(cat "$LOG1")"
  grep -q "^cwd=.*/cwd dir\$" "$LOG1" && ok "and ran in the caller's directory" || bad "the working directory was lost" "$(cat "$LOG1")"
  grep -q '^late$' "$LOG1" && grep -q '^detach-exit=0$' "$LOG1" && ok "it ran to the end and logged exit 0" || bad "the command did not finish" "$(cat "$LOG1")"
else
  bad "the detached command never finished" "$(cat "$LOG1" 2>/dev/null)"
fi

LOG2="$WORK/two.log"
"$KIT/scripts/detach.sh" "$LOG2" bash -c 'exit 7' >/dev/null
wait_exit "$LOG2" 30 && grep -q '^detach-exit=7$' "$LOG2" && ok "a failing command's exit code reaches the log" \
  || bad "the exit code was lost" "$(cat "$LOG2" 2>/dev/null)"

leftover="$(ls -d "$TMPDIR"/vantry-detach.* 2>/dev/null | wc -l)"
[ "$leftover" -eq 0 ] && ok "the private environment files are removed" || bad "$leftover vantry-detach.* dirs were left behind" ""

rm -rf "$WORK"
echo; echo "detach: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
