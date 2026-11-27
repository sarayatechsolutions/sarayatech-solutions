#!/usr/bin/env bash
# ============================================================================
#  test-run-all.sh — proves run-all.sh skips a suite ONLY when verify.sh is
#  about to run that exact suite as an acceptance criterion, and says so.
#  The real run-all.sh is executed against a throwaway kit whose suites are
#  stubs that print their own name, so the test reads what actually ran.
#  Usage: bash scripts/test/test-run-all.sh [kit-path]
# ============================================================================
set -uo pipefail
# Inside a verification this suite inherits VANTRY_VERIFY=1 from verify.sh, which
# made its own "outside verify.sh" case skip suites and fail. Start from neither.
unset VANTRY_VERIFY RUN_ALL_NO_DEDUP
KIT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
KIT="$(cd "$KIT" && pwd)"
WORK="$(mktemp -d)"
PASS=0; FAIL=0
ok()  { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; [ -n "${2:-}" ] && echo "$2" | sed 's/^/        /' | head -20; FAIL=$((FAIL + 1)); }

echo; echo "── run-all.sh: one run of each suite per verification ─────"

K="$WORK/kit"
mkdir -p "$K/scripts/test" "$K/scripts/lib"
cp "$KIT/scripts/test/run-all.sh" "$K/scripts/test/"
cp "$KIT/scripts/lib/vantry-common.sh" "$K/scripts/lib/"
for s in test-install-safety test-verify-gate test-digest test-detach test-hooks \
         test-forge-quality test-kanban-import test-ci-local test-run-all; do
  printf '#!/usr/bin/env bash\necho "RAN %s"\n' "$s" > "$K/scripts/test/$s.sh"
done
cat > "$K/vantry.yml" <<'YML'
version: 1
acceptance:
  - "AC-1 | REQ-1 | the gate holds | bash scripts/test/test-verify-gate.sh"
  - "AC-2 | REQ-2 | install is safe | bash scripts/test/test-install-safety.sh ."
  - "AC-3 | REQ-3 | a criterion that can pass while the suite fails | bash scripts/test/test-hooks.sh || true"
  - "AC-4 | REQ-4 | mentions bash scripts/test/test-detach.sh only in prose | true"
  - "BAD-5 | REQ-5 | an id verify.sh refuses | bash scripts/test/test-forge-quality.sh"
YML
( cd "$K" && git init -q . ) >/dev/null 2>&1

OUT="$(cd "$K" && VANTRY_VERIFY=1 bash scripts/test/run-all.sh --e2e 2>&1)"
ran()     { printf '%s\n' "$OUT" | grep -q "^RAN $1\$"; }
skipped() { printf '%s\n' "$OUT" | grep -q "^↷ scripts/test/$1.sh — runs as its own acceptance criterion"; }

skipped test-verify-gate && ! ran test-verify-gate \
  && ok "a suite that is exactly a criterion is skipped, out loud" || bad "AC-1's suite was not skipped" "$OUT"
skipped test-install-safety && ! ran test-install-safety \
  && ok "\`bash <suite> .\` counts as the same run" || bad "AC-2's suite was not skipped" "$OUT"
ran test-hooks && ok "a criterion that only CONTAINS the suite (|| true) never replaces it" \
  || bad "a neutered criterion stood in for a gating suite" "$OUT"
ran test-detach && ok "a suite named only in a criterion's prose still runs" || bad "prose caused a skip" "$OUT"
ran test-forge-quality && ok "an entry verify.sh refuses to run causes no skip" || bad "a malformed entry caused a skip" "$OUT"
ran test-digest && ran test-kanban-import && ran test-ci-local && ok "suites no criterion names all run" \
  || bad "an unrelated suite went missing" "$OUT"

OUT="$(cd "$K" && bash scripts/test/run-all.sh --e2e 2>&1)"
n="$(printf '%s\n' "$OUT" | grep -c '^RAN ')"
! printf '%s\n' "$OUT" | grep -q '^↷' && [ "$n" -ge 8 ] \
  && ok "outside verify.sh (CI, a human) nothing is skipped — $n suites ran" || bad "a suite was skipped without VANTRY_VERIFY" "$OUT"
OUT="$(cd "$K" && VANTRY_VERIFY=1 RUN_ALL_NO_DEDUP=1 bash scripts/test/run-all.sh --e2e 2>&1)"
! printf '%s\n' "$OUT" | grep -q '^↷' && ok "RUN_ALL_NO_DEDUP=1 turns the skip off" || bad "RUN_ALL_NO_DEDUP was ignored" "$OUT"

rm -rf "$WORK"
echo; echo "run-all: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
