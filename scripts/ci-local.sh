#!/usr/bin/env bash
# ci-local.sh — run the GitHub Actions workflows on this machine, before paying
# for them.
#
# WHY THIS EXISTS, in numbers measured on this repo: one push to main billed
# ~65 Actions minutes, and 50 of those were a SINGLE job — the e2e leg on
# macos-latest, which GitHub bills at 10× the minute. That is ~30 pushes a month
# against the free 2000. Meanwhile the person pushing was sitting at a Mac, where
# that same job runs natively for nothing.
#
# So this is not a mock of CI and not a second implementation of it. It reads
# `.github/workflows/*.yml` and executes THE STEPS THEY DECLARE, so there is no
# copy to drift. Two rules keep it honest:
#
#   1. A step it cannot faithfully run is REPORTED AS NOT RUN, with the reason.
#      It is never quietly skipped and never approximated. A local CI that says
#      "all green" while silently dropping four steps is worse than no local CI,
#      because you would then push on the strength of it.
#   2. `--coverage` cross-checks the plan against a plain grep of the workflow
#      files — a count taken WITHOUT the parser. If the parser ever misreads a
#      file, the two numbers disagree and this fails loudly instead of running
#      less than it claims.
#
# It does not replace CI and cannot: CI is the impartial re-run on a clean
# machine, and it must never trust a local result. What it replaces is the
# EXPENSIVE and the FAILED runs — the four red pushes it takes to get one green.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

# `all` — the union of every trigger the workflows declare — is the default on
# purpose. Simulating one event locally reproduces CI's blind spots locally,
# which is backwards: the macOS job is kept OFF the push path precisely so that
# it runs here instead, and planning for `push` alone would skip it on both
# sides. `--event push` is still available for the different question, "what
# will CI actually do when I push?".
EVENT="all"; KEEP_GOING=0; MODE="run"; ONLY=""; VERBOSE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --event) EVENT="${2:-push}"; shift 2 ;;
    --pr) EVENT="pull_request"; shift ;;
    --coverage) MODE="coverage"; shift ;;
    --plan) MODE="plan"; shift ;;
    --keep-going|-k) KEEP_GOING=1; shift ;;
    --only) ONLY="${2:-}"; shift 2 ;;
    -v|--verbose) VERBOSE=1; shift ;;
    -h|--help)
      sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
      cat <<'USAGE'

usage: scripts/ci-local.sh [options]
  --event <name>          simulate one trigger (push, pull_request, schedule).
                          Default is the UNION of all of them — what CI could
                          run anywhere, so nothing falls between two triggers.
  --pr                    shorthand for --event pull_request
  --only <substring>      run only workflows/jobs whose name matches
  --coverage              report what this machine can and cannot run, and exit
  --plan                  print the resolved plan without running anything
  -k, --keep-going        run every step even after one fails
  -v, --verbose           stream each step's output instead of buffering it
USAGE
      exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

US=$(printf '\037')   # the record separator ci-plan.py emits

command -v python3 >/dev/null 2>&1 || {
  echo "✗ python3 is required to read the workflow files." >&2; exit 2; }

# ── the plan ────────────────────────────────────────────────────────────────
# Emitted as tab-separated records so bash can drive it without a YAML library.
PLAN=$(python3 "$ROOT/scripts/lib/ci-plan.py" "$EVENT")

case "$PLAN" in FATAL*) printf '✗ %s\n' "${PLAN#FATAL$'\x1f'}" >&2; exit 2 ;; esac

# ── coverage: cross-check the plan against a parser-independent count ────────
# The plan above came from PyYAML. This count comes from grep. If a future
# workflow uses a shape the planner misreads, these two disagree and we say so —
# a coverage report produced by the same code it is checking would prove nothing.
if [ "$MODE" = "coverage" ]; then
  echo "── what this machine can run of the workflows ──"
  printf '\n  %-46s %s\n' "step" "status"
  printf '  %s\n' "$(printf '─%.0s' $(seq 1 74))"
  printf '%s\n' "$PLAN" | while IFS=$'\x1f' read -r t a b c d e f; do
    case "$t" in
      WF)  printf '\n  %s  [%s] %s\n' "$b" "$c" "$d" ;;
      JOB) printf '    job: %-40s %s %s\n' "$b" "$c" "$d" ;;
      ST)  case "$a" in
             RUN)  printf '      %-44s will run\n' "${b:0:43}" ;;
             NOOP) printf '      %-44s n/a — %s\n' "${b:0:43}" "$f" ;;
             SKIP) printf '      %-44s skipped — %s\n' "${b:0:43}" "$f" ;;
             DUP)  : ;;
             GAP)  printf '      %-44s ✗ NOT RUN — %s\n' "${b:0:43}" "$f" ;;
           esac ;;
    esac
  done
  # -H, not bare -c: with exactly ONE workflow file grep prints just the number
  # and the `awk -F:` below reads an empty second field, so the cross-check
  # silently compares against zero. A repo with a single workflow — most repos —
  # would have had no cross-check at all.
  declared="$(grep -cHE '^[[:space:]]*-?[[:space:]]*run:' .github/workflows/*.yml 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')"
  # An action step (`uses:`) is not a `run:` line, so grep never counted it; the
  # planner marks it "@uses" and it is left out of this match too. It still shows
  # above as NOT RUN and still counts in $gaps — excluded from the match, not hidden.
  seen="$(printf '%s\n' "$PLAN" | awk -F"$US" '$1=="ST" && $6!="@uses" && ($2=="RUN"||$2=="SKIP"||$2=="GAP"||$2=="DUP")' | wc -l | tr -d ' ')"
  gaps="$(printf '%s\n' "$PLAN" | awk -F"$US" '$1=="ST" && $2=="GAP"' | wc -l | tr -d ' ')"
  echo
  echo "  shell steps the workflows declare (counted by grep, not by the parser): $declared"
  echo "  shell steps this plan accounts for (event: $EVENT):                     $seen"
  [ "$gaps" != "0" ] && echo "  steps this machine cannot run:                                          $gaps"
  echo
  if [ "$EVENT" != "all" ]; then
    echo "  Note: a step can legitimately be absent from a '$EVENT' plan because its"
    echo "  workflow or job does not trigger on '$EVENT'. Drop --event to plan the union."
  elif [ "$declared" != "$seen" ]; then
    echo "  ✗ THESE TWO NUMBERS MUST MATCH when planning the union of all triggers."
    echo "    They do not, which means the planner is not reading something these"
    echo "    workflows declare. Treat a green local run as unproven until they agree."
    exit 1
  else
    echo "  These two numbers agree, so the plan accounts for every shell step the"
    echo "  workflows declare — checked by grep, independently of the parser."
  fi
  exit 0
fi

if [ "$MODE" = "plan" ]; then printf '%s\n' "$PLAN"; exit 0; fi

# ── run ─────────────────────────────────────────────────────────────────────
PASS=0; FAILED=0; GAPS=0; SKIPPED=0
FAILED_NAMES=""; GAP_NAMES=""
START_ALL=$(date +%s)
CUR_JOB=""; CUR_WF=""

decode() { printf '%s' "$1" | base64 --decode 2>/dev/null || printf '%s' "$1" | base64 -D 2>/dev/null; }

run_step() {
  local name="$1" script="$2" envjson="$3" wd="$4"
  local t0 t1 rc log
  log="$(mktemp)"
  t0=$(date +%s)
  (
    set -a
    eval "$(printf '%s' "$envjson" | python3 -c '
import json,sys,shlex
for k,v in json.load(sys.stdin).items(): print("%s=%s" % (k, shlex.quote(str(v))))')"
    set +a
    # The variables a workflow step can reasonably read about its own run.
    export CI=true GITHUB_ACTIONS="" VANTRY_CI_LOCAL=1
    export GITHUB_EVENT_NAME="$EVENT" GITHUB_WORKSPACE="$ROOT"
    GITHUB_REF="refs/heads/$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
    export GITHUB_REF
    # A step's working-directory not existing is a failure of the step, not
    # something to shrug at and run in the wrong place.
    if [ -n "$wd" ]; then cd "$wd" || { echo "no such working-directory: $wd" >&2; exit 1; }; fi
    bash -e -o pipefail -c "$script"
  ) >"$log" 2>&1
  rc=$?
  t1=$(date +%s)
  if [ "$rc" = "0" ]; then
    printf '    ✓ %-52s %3ds\n' "${name:0:51}" "$((t1-t0))"
    PASS=$((PASS+1))
    [ "$VERBOSE" = "1" ] && sed 's/^/        /' "$log"
  else
    printf '    ✗ %-52s %3ds  (exit %d)\n' "${name:0:51}" "$((t1-t0))" "$rc"
    FAILED=$((FAILED+1)); FAILED_NAMES="$FAILED_NAMES
      $CUR_JOB → $name"
    sed 's/^/        /' "$log" | tail -25
  fi
  rm -f "$log"
  return $rc
}

echo "── running the workflows locally, event: $EVENT ──"
echo "   host: $(uname -s) $(uname -m) · this does not replace CI; it precedes it"

while IFS=$'\x1f' read -r t a b c d e f; do
  case "$t" in
    WF)
      CUR_WF="$b"
      [ -n "$ONLY" ] && case "$b" in *"$ONLY"*) : ;; *) CUR_WF=""; continue ;; esac
      if [ "$c" = "TRIGGERED" ]; then printf '\n  %s\n' "$b"
      else printf '\n  %s — %s\n' "$b" "$e"; fi ;;
    JOB)
      [ -z "$CUR_WF" ] && continue
      CUR_JOB="$b"
      case "$c" in
        RUN)      printf '  · %s\n' "$b" ;;
        DUP)      printf '  · %s — %s\n' "$b" "$d"; CUR_JOB="" ;;
        OTHER-OS) printf '  · %s — %s\n' "$b" "$d"; CUR_JOB="" ;;
        SKIP)     printf '  · %s — %s\n' "$b" "$d"; SKIPPED=$((SKIPPED+1)); CUR_JOB="" ;;
        GAP)      printf '  · %s — ✗ %s\n' "$b" "$d"; GAPS=$((GAPS+1))
                  GAP_NAMES="$GAP_NAMES
      $b — $d"; CUR_JOB="" ;;
      esac ;;
    ST)
      [ -z "$CUR_JOB" ] && continue
      case "$a" in
        RUN)
          run_step "$b" "$(decode "$c")" "$(decode "$d")" "$e" || {
            [ "$KEEP_GOING" = "1" ] || { echo; echo "  stopping at the first failure (-k to keep going)"; break; }
          } ;;
        NOOP) printf '    · %-52s n/a (%s)\n' "${b:0:51}" "$f" ;;
        SKIP) SKIPPED=$((SKIPPED+1)) ;;
        GAP)  printf '    ✗ %-52s NOT RUN — %s\n' "${b:0:51}" "$f"
              GAPS=$((GAPS+1)); GAP_NAMES="$GAP_NAMES
      $CUR_JOB → $b — $f" ;;
      esac ;;
  esac
done <<< "$PLAN"

ELAPSED=$(( $(date +%s) - START_ALL ))
echo
echo "=============================================================="
printf ' %d step(s) passed, %d failed, %d not runnable here, %d skipped   [%dm%02ds]\n' \
  "$PASS" "$FAILED" "$GAPS" "$SKIPPED" "$((ELAPSED/60))" "$((ELAPSED%60))"
echo "=============================================================="

if [ "$FAILED" != "0" ]; then
  echo "  failed:$FAILED_NAMES"
  echo
  echo "  Fix these before pushing. Every one of them would have been a red CI"
  echo "  run — and a red run costs the same minutes as a green one."
  exit 1
fi
if [ "$GAPS" != "0" ]; then
  echo "  NOT RUN here — CI still owns these:$GAP_NAMES"
  echo
  echo "  This is reported, not hidden. Local green means 'the steps listed above"
  echo "  passed', never 'CI will pass'."
fi
echo "  Local run is green. CI remains the impartial check on a clean machine —"
echo "  it re-runs the contract and does not trust this result."
exit 0
