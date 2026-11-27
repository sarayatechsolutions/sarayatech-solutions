#!/usr/bin/env bash
# scripts/ci-local.sh runs GitHub Actions workflows on this machine so a sprint's
# worth of red pushes does not get billed at 10x on a macOS runner.
#
# Its ONLY value is fidelity. A local runner that reports green while quietly
# doing less than the workflows declare is not a saving — it is a licence to push
# broken work with confidence. So every test here attacks that: does it actually
# fail when a step fails, does it refuse to guess, and does it say so out loud.
KIT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
KIT="$(cd "$KIT" && pwd)"
WORK="$(mktemp -d)"
PASS=0; FAIL=0
ok()  { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad() { echo "  ✗ $1"; echo "      saw: $2"; FAIL=$((FAIL+1)); }
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

# A scratch project carrying only the runner and whatever workflow a test writes.
scratch() {
  local d="$WORK/$1"; rm -rf "$d"; mkdir -p "$d/scripts/lib" "$d/.github/workflows"
  cp "$KIT/scripts/ci-local.sh" "$d/scripts/"
  cp "$KIT/scripts/lib/ci-plan.py" "$d/scripts/lib/"
  chmod +x "$d/scripts/ci-local.sh"
  printf '%s' "$d"
}

echo "=============================================================="
echo " ci-local — does it really run the workflows, and really fail"
echo "=============================================================="

# ── 1. a failing step must fail the run ─────────────────────────────────────
D="$(scratch fail)"
cat > "$D/.github/workflows/x.yml" <<'Y'
name: x
on: [push]
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - name: this passes
        run: echo fine
      - name: this fails
        run: exit 3
Y
OUT="$(cd "$D" && ./scripts/ci-local.sh 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "a failing workflow step fails the local run (exit $RC)" \
  || bad "a step exited 3 and the run still reported success" "$(printf '%s' "$OUT" | tail -4)"
case "$OUT" in *"this fails"*) ok "…and names the step that failed" ;;
  *) bad "failed without naming the step" "$(printf '%s' "$OUT" | tail -4)" ;; esac
case "$OUT" in *"1 step(s) passed"*) ok "…after having really run the step before it" ;;
  *) bad "the earlier step did not run" "$(printf '%s' "$OUT" | tail -4)" ;; esac

# ── 2. a step it cannot resolve must be REPORTED, never guessed ─────────────
# This is the important one. GitHub's own expression semantics already cost this
# repo a silent bug; a local runner that substituted an empty string for an
# expression it did not understand would reproduce that class of defect on
# purpose. Not running it and SAYING SO is the only honest option.
D="$(scratch unresolved)"
cat > "$D/.github/workflows/x.yml" <<'Y'
name: x
on: [push]
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - name: needs a secret
        run: echo "${{ secrets.DEPLOY_TOKEN }}" > /dev/null
      - name: ordinary
        run: echo fine
Y
OUT="$(cd "$D" && ./scripts/ci-local.sh 2>&1)"
case "$OUT" in *"NOT RUN"*) ok "a step with an unresolvable expression is reported NOT RUN" ;;
  *) bad "an unresolvable expression was not flagged" "$(printf '%s' "$OUT" | tail -6)" ;; esac
case "$OUT" in *"secrets.DEPLOY_TOKEN"*) ok "…naming exactly what it could not resolve" ;;
  *) bad "flagged without saying what" "$(printf '%s' "$OUT" | tail -6)" ;; esac
case "$OUT" in *"not runnable here"*) ok "…and the summary carries the gap forward" ;;
  *) bad "the summary hid the gap" "$(printf '%s' "$OUT" | tail -4)" ;; esac

# ── 3. the coverage cross-check must catch a step the planner cannot read ───
D="$(scratch drift)"
cat > "$D/.github/workflows/x.yml" <<'Y'
name: x
on: [push]
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - name: ordinary
        run: echo fine
Y
(cd "$D" && ./scripts/ci-local.sh --coverage >/dev/null 2>&1) \
  && ok "coverage passes while the plan matches the workflows" \
  || bad "coverage failed on a workflow it fully understands" "$(cd "$D" && ./scripts/ci-local.sh --coverage 2>&1 | tail -6)"

# now hide a step behind a job condition the planner does not understand: the
# grep count rises, the plan does not, and the two must disagree LOUDLY.
cat >> "$D/.github/workflows/x.yml" <<'Y'
  b:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.message, 'deploy')
    steps:
      - name: unreadable condition
        run: echo nope
Y
OUT="$(cd "$D" && ./scripts/ci-local.sh --coverage 2>&1)"; RC=$?
[ "$RC" != "0" ] && ok "a job whose condition it cannot read fails --coverage" \
  || bad "coverage stayed green while a whole job went unplanned" "$(printf '%s' "$OUT" | tail -8)"

# A third-party action is a `uses:` step, not a `run:` line: grep never counts
# it, so the plan must not count it either — or ANY workflow that sets up a JDK
# fails --coverage. It must still be reported as NOT RUN, never dropped.
D="$(scratch action)"
cat > "$D/.github/workflows/x.yml" <<'Y'
name: x
on: [push]
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: set up a JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
      - name: ordinary
        run: echo fine
Y
OUT="$(cd "$D" && ./scripts/ci-local.sh --coverage 2>&1)"; RC=$?
[ "$RC" = "0" ] && ok "a third-party action does not break the coverage cross-check" \
  || bad "coverage failed on a workflow whose only extra step is an action" "$(printf '%s' "$OUT" | tail -8)"
case "$OUT" in *"set up a JDK"*"NOT RUN"*"actions/setup-java"*)
  ok "the action is still reported NOT RUN, with its name" ;;
  *) bad "the action step vanished from the coverage report" "$(printf '%s' "$OUT" | tail -12)" ;; esac
printf '%s\n' "$OUT" | grep -Eq 'cannot run: +1$' \
  && ok "the action still counts as a step this machine cannot run" \
  || bad "the action was dropped from the not-runnable count" "$(printf '%s' "$OUT" | tail -8)"

# ── 4. green means green, and says what it does NOT cover ───────────────────
D="$(scratch green)"
cat > "$D/.github/workflows/x.yml" <<'Y'
name: x
on: [push]
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ordinary
        run: echo fine
Y
OUT="$(cd "$D" && ./scripts/ci-local.sh 2>&1)"; RC=$?
[ "$RC" = "0" ] && ok "a workflow that passes reports green" \
  || bad "a passing workflow reported failure" "$(printf '%s' "$OUT" | tail -6)"
case "$OUT" in *"does not trust this result"*)
    ok "…while stating CI is still the impartial check" ;;
  *) bad "green without the caveat that CI still owns the verdict" "$(printf '%s' "$OUT" | tail -4)" ;; esac

# ── 5. a matrix leg for another OS belongs to CI, not to a false green ──────
D="$(scratch matrix)"
cat > "$D/.github/workflows/x.yml" <<'Y'
name: x
on: [push]
jobs:
  a:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - name: ordinary
        run: echo fine
Y
OUT="$(cd "$D" && ./scripts/ci-local.sh --coverage 2>&1)"
case "$OUT" in *"CI owns it"*)
    ok "a matrix leg for another OS is handed back to CI, not faked" ;;
  *) bad "an other-OS matrix leg was not reported as CI's" "$(printf '%s' "$OUT" | tail -8)" ;; esac
# Same mapping as ci-plan.py (platform.system()). Git Bash reports MINGW64_NT-…,
# which the old Darwin/Linux-only mapping left raw, so this case failed on every
# Windows host while the planner had in fact planned the windows leg.
HOSTKEY=$(uname -s | sed 's/^Darwin$/macos/;s/^Linux$/ubuntu/;s/^MINGW.*/windows/;s/^MSYS.*/windows/;s/^CYGWIN.*/windows/')
# The host's OWN leg must be the one marked RUN — the word alone also appears in
# "this machine is <host>" on every other leg, which proved nothing.
if printf '%s\n' "$OUT" | grep -Eq "os=${HOSTKEY}-latest\).*RUN"; then
  ok "…while this machine's own leg ($HOSTKEY) is planned to run"
else
  bad "this host's matrix leg was not planned" "$(printf '%s' "$OUT" | tail -8)"
fi

echo
echo "=============================================================="
printf " RESULT: %d passed, %d failed\n" "$PASS" "$FAIL"
echo "=============================================================="
[ "$FAIL" -eq 0 ]
