#!/usr/bin/env bash
# =============================================================================
#  lint-kanban.sh — refuse a backlog that cannot be worked.
#
#  import-kanban.sh talks to the network. Every defect this catches would
#  otherwise be found after issues exist on GitHub, when fixing it means editing
#  or deleting real issues. So this runs BEFORE the first API call — and from
#  run-all.sh --unit, but deliberately NOT from .githooks/pre-commit: a guard
#  that blocks a commit in the middle of grooming gets uninstalled.
#
#  Usage: scripts/kanban/lint-kanban.sh [csv]   (default scripts/kanban/issues.csv)
# =============================================================================
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CSV="${1:-$ROOT/scripts/kanban/issues.csv}"
ERR=0
err() { echo "  ✗ $1"; ERR=1; }

[ -f "$CSV" ] || { echo "✗ no backlog at $CSV"; exit 1; }
echo "→ linting $CSV"

HEADER="$(head -1 "$CSV")"
NCOL="$(printf '%s' "$HEADER" | awk -F, '{print NF}')"
ROWS="$(($(wc -l < "$CSV") - 1))"

# ---- 1. arity, derived from the header -------------------------------------
# A comma inside a title shifts every later column, which silently mis-files the
# sprint. The count comes from the header so the schema can grow.
BAD="$(awk -F, -v n="$NCOL" 'NR>1 && NF>0 && NF!=n {printf "    line %d has %d columns, header has %d: %s\n", NR, NF, n, $1}' "$CSV")"
[ -n "$BAD" ] && { err "rows do not match the header's $NCOL columns (a comma inside a title is the usual cause):"; printf '%s\n' "$BAD"; }

# ---- 2. ids are present, well-formed and unique ----------------------------
DUP="$(awk -F, 'NR>1 && NF>0 {print $1}' "$CSV" | sort | uniq -d)"
[ -n "$DUP" ] && err "duplicate issue id(s): $(printf '%s' "$DUP" | tr '\n' ' ')"
MAL="$(awk -F, 'NR>1 && NF>0 && $1 !~ /^[A-Z][A-Z0-9]{1,5}-[0-9]{1,4}$/ {printf "%s ", $1}' "$CSV")"
[ -n "$MAL" ] && err "malformed id(s) (expected e.g. PRJ-014): $MAL"

# ---- 3. every dependency exists --------------------------------------------
# awk, not a shell loop: a `while read` inside $( ) runs in a subshell, so ERR
# set inside it never reaches the caller — the check would print nothing and
# pass. Exactly the class of silently-discarded finding this kit exists to stop.
DEPBAD="$(awk -F, '
  NR>1 && NF>0 { have[$1]=1; id[++n]=$1; deps[$1]=$8 }
  END {
    for (i=1;i<=n;i++) {
      k=id[i]; m=split(deps[k], d, /[; ]+/)
      for (j=1;j<=m;j++)
        if (d[j] != "" && !(d[j] in have))
          printf "    %s depends on %s, which is not in this backlog\n", k, d[j]
    }
  }' "$CSV")"
[ -n "$DEPBAD" ] && { err "unresolvable dependencies:"; printf '%s\n' "$DEPBAD"; }

# ---- 4. no dependency cycles -----------------------------------------------
# Kahn's algorithm: repeatedly remove nodes with no unmet dependency. Whatever
# is left is, by definition, in a cycle — and a cycle means /next can never
# schedule any of them, forever, with no error to explain why.
CYC="$(awk -F, '
  NR>1 && NF>0 { id[++n]=$1; deps[$1]=$8 }
  END {
    for (i=1;i<=n;i++) alive[id[i]]=1
    changed=1
    while (changed) {
      changed=0
      for (i=1;i<=n;i++) {
        k=id[i]; if (!alive[k]) continue
        ready=1
        m=split(deps[k], d, /[; ]/)
        for (j=1;j<=m;j++) if (d[j] != "" && alive[d[j]]) ready=0
        if (ready) { alive[k]=0; changed=1 }
      }
    }
    for (i=1;i<=n;i++) if (alive[id[i]]) printf "%s ", id[i]
  }' "$CSV")"
[ -n "$CYC" ] && err "dependency cycle — these can never be scheduled: $CYC"

# ---- 5. controlled vocabularies --------------------------------------------
check_col() {  # $1 = column index, $2 = column name, $3 = allowed values
  local bad
  bad="$(awk -F, -v c="$1" -v ok=" $3 " '
    NR>1 && NF>0 && $c != "" && index(ok, " " $c " ") == 0 { seen[$c]=1 }
    END { for (v in seen) printf "%s ", v }' "$CSV")"
  [ -n "$bad" ] && err "$2: unexpected value(s): $bad  (allowed: $3)"
}
check_col 6 priority "P0 P1 P2 P3"
check_col 7 size     "XS S M L XL"
# `backlog` is what /bootstrap, /decompose-feature and the kanban README all
# tell you to write for an unscheduled item. It was rejected here, so the
# prescribed backlog failed its own linter.
check_col 9 status   "backlog todo in-progress in-review blocked blocked-gate awaiting-merge done"

# ---- 6. the agent must exist ------------------------------------------------
AGBAD=""
for a in $(awk -F, 'NR>1 && NF>0 && $5 != "" {print $5}' "$CSV" | sort -u); do
  [ -f "$ROOT/agents/$a.md" ] || AGBAD="$AGBAD $a"
done
[ -n "$AGBAD" ] && err "assigned to persona(s) that do not exist in agents/:$AGBAD"
# The agent column was checked only when it was non-empty, so a blank one passed
# — and /next has no defined behaviour for an issue with no lead role.
NOAG="$(awk -F, 'NR>1 && NF>0 && $5 == "" {printf "%s ", $1}' "$CSV")"
[ -n "$NOAG" ] && err "issue(s) with no lead agent — /next cannot dispatch them: $NOAG"

# ---- 7. MUST coverage, when a spec exists ----------------------------------
# The one line that changes a decision: "your MVP has 11 MUST and 7 have no issue."
SPEC="$ROOT/docs/specs/functional-spec.md"
if [ -f "$SPEC" ] && [ "$NCOL" -ge 12 ]; then
  MISSING=""; TOTAL=0
  while IFS= read -r r; do
    [ -n "$r" ] || continue
    TOTAL=$((TOTAL + 1))
    # Whole-field match. `grep -q REQ-1` also matches REQ-10, so a requirement
    # with no issue was reported as covered by an unrelated one — the
    # traceability claim lying in exactly the direction that hides work.
    awk -F, -v r="$r" 'NR>1 && $12 != "" { n = split($12, a, /[; ]+/); for (i = 1; i <= n; i++) if (a[i] == r) f = 1 } END { exit !f }' "$CSV" \
      || MISSING="$MISSING $r"
  done <<EOF
$(grep -oE 'REQ-[0-9]{1,4}' "$SPEC" | sort -u)
EOF
  if [ -n "$MISSING" ]; then
    err "these MUST requirements have no issue in the backlog:$MISSING"
    echo "    ($TOTAL requirement(s) in $SPEC. An unplanned MUST is a missing MVP, not a missing ticket.)"
  elif [ "$TOTAL" -gt 0 ]; then
    echo "  ✓ all $TOTAL requirement(s) in the spec are covered by at least one issue"
  fi
fi

echo "  $ROWS row(s), $NCOL column(s)"
echo

# ---- security: yes  vs  vantry.yml sensitive_paths --------------------------
# Two independent declarations of the same property, and nothing reconciled them.
# `security: yes` drives the issue's Definition-of-Done line; `sensitive_paths`
# drives the CI job that actually blocks the merge. They drift both ways: a
# decorative promise, or a PR blocked with no warning.
#
# An earlier version left $_pth unquoted, so the shell applied PATHNAME EXPANSION
# on top of the `;` split. The verdict then depended on which files happened to
# sit on that machine, and bash's `**` degrades to `*`, so it only ever looked one
# level deep. Two neighbouring rows were judged by two different methods, and
# neither was the documented one: `**/src/test/**` expanded and was called
# sensitive, while `**/application.yml` did not expand and fell through to a probe.
#
# ONLY WHAT IS CERTAIN IS REPORTED, and that restraint is the whole design.
#
# An issue declares COARSE globs; the gate judges INDIVIDUAL changed files. From
# `courseservice/**` one cannot tell whether a given PR will touch
# `courseservice/**/security/JwtConverter.java`. Answering "some file under this
# glob is sensitive" marks nearly every broad issue sensitive — "compute lesson
# duration" included — and this file's own rule applies: noise is how a real
# warning gets ignored. Answering "the glob with every `*` replaced by a letter
# is not sensitive" misses `**/application.yml`, which certainly is.
#
# So partial overlap says nothing, because nothing is knowable there. Two cases
# remain, and both are facts rather than guesses:
#
#   * EVERY file matching one of the issue's globs is sensitive, yet
#     security=no — working this issue at all trips the gate;
#   * NO file matching any of its globs can be sensitive, yet security=yes —
#     the Definition-of-Done promises a review that will never be required.
#
# An issue whose files do not exist yet has nothing to match, so the probe is
# all that is left for it.
if [ -f "$ROOT/vantry.yml" ] && [ -f "$ROOT/scripts/lib/vantry-common.sh" ]; then
  # shellcheck source=../lib/vantry-common.sh
  . "$ROOT/scripts/lib/vantry-common.sh" 2>/dev/null || true
  if type vantry_cfg_list >/dev/null 2>&1; then
    _sens="$(mktemp)"; _files="$(mktemp)"; _roots="$(mktemp)"
    trap 'rm -f "$_sens" "$_files" "$_roots"' EXIT
    vantry_cfg_list sensitive_paths > "$_sens"

    # One repository, or one per subdirectory: the kit is used both ways, so
    # look for both rather than assuming. Untracked files are excluded on
    # purpose — the gate judges what a PR changes, and a PR only changes what
    # git knows about.
    : > "$_files"
    git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1 && git -C "$ROOT" ls-files >> "$_files"
    for _d in "$ROOT"/*/; do
      [ -d "$_d" ] || continue
      _d="${_d%/}"; _n="$(basename "$_d")"
      git -C "$_d" rev-parse --git-dir >/dev/null 2>&1 || continue
      git -C "$_d" ls-files | sed "s#^#$_n/#" >> "$_files"
    done
    sort -u -o "$_files" "$_files"

    # Only judge rows that describe THIS project. The shipped sample backlog
    # names a hypothetical app (lib/env.*, migrations/**); warning about it in a
    # repo that has no lib/ is noise, and noise is how a real warning gets
    # ignored. This tests the filesystem, not git: a directory can legitimately
    # be untracked here — `scripts/` is, in a multi-repo layout — and skipping
    # its issues would hide exactly the rows this project owns.
    awk -F, 'NR>1 && $11!="" {n=split($11,a,";"); for(i=1;i<=n;i++){r=a[i]; sub(/\/.*$/,"",r); sub(/\*.*$/,"",r); if(r!="") print r}}' "$CSV" \
      | sort -u | while IFS= read -r _r; do [ -e "$ROOT/$_r" ] && printf '%s\n' "$_r"; done > "$_roots"

    _mismatch="$(awk -F, -v f_sens="$_sens" -v f_files="$_files" -v f_roots="$_roots" '
      # Transcribed from vantry_glob_to_re, and proven identical to it on every
      # glob this backlog and this config contain. The order of substitutions is
      # not incidental: the `?` produced by the `**` rules must survive the
      # `? -> [^/]` rule, so it travels as a placeholder and is restored last.
      function glob_re(g,   s) {
        s = g
        gsub(/[][\\.^$+(){}|]/, "\\\\&", s)
        gsub(/\*\*\//, "(@@ANY@@/)@@OPT@@", s)
        gsub(/\/\*\*/, "(/@@ANY@@)@@OPT@@", s)
        gsub(/\*\*/,   "@@ANY@@", s)
        gsub(/\*/,     "[^/]*", s)
        gsub(/\?/,     "[^/]", s)
        gsub(/@@ANY@@/, ".*", s)
        gsub(/@@OPT@@/, "?", s)
        return "^" s "$"
      }
      FILENAME == f_sens  { if ($0 != "") sre[++ns] = glob_re($0); next }
      FILENAME == f_files { if ($0 != "") fil[++nf] = $0; next }
      FILENAME == f_roots { if ($0 != "") roots[$0] = 1; next }

      # Which files the gate considers sensitive is settled once, before the
      # first row. Recomputing it per issue would multiply the same regex work
      # by the size of the backlog for an answer that cannot change.
      FNR == 1 { for (i = 1; i <= nf; i++) for (j = 1; j <= ns; j++)
                   if (fil[i] ~ sre[j]) { est_sensible[fil[i]] = 1; break }
                 next }
      NF == 0 { next }
      {
        pth = $11; sec = $13; gsub(/[ \t\r]/, "", sec)
        if (pth == "") next
        n = split(pth, g, ";")
        certain = 0   # one glob under which EVERY file is sensitive
        possible = 0  # one file, anywhere under the globs, that is sensitive
        real = 0
        for (k = 1; k <= n; k++) {
          if (g[k] == "") continue
          r = g[k]; sub(/\/.*$/, "", r); sub(/\*.*$/, "", r)
          if (r != "" && (r in roots)) real = 1
          re = glob_re(g[k]); total = 0; sensibles = 0
          for (i = 1; i <= nf; i++) {
            if (fil[i] !~ re) continue
            total++
            if (fil[i] in est_sensible) sensibles++
          }
          if (total > 0) {
            if (sensibles > 0) possible = 1
            if (sensibles == total) certain = 1
          } else {
            # Nothing tracked matches: the files do not exist yet. Only the
            # glob itself can be judged, with every `*` standing in for a
            # segment. It is coarse, and it is all there is.
            p = g[k]; gsub(/\*\*/, "x", p); gsub(/\*/, "x", p)
            for (j = 1; j <= ns; j++)
              if (p ~ sre[j]) { certain = 1; possible = 1; break }
          }
        }
        if (!real) next
        if (sec == "yes" && !possible)
          printf "      %s: security=yes but NO file under its paths can be sensitive — the DoD promises a review CI will never require\n", $1
        else if (sec == "no" && certain)
          printf "      %s: security=no but EVERY file under its paths is sensitive — CI will block the PR with no warning\n", $1
      }
    ' "$_sens" "$_files" "$_roots" "$CSV")"

    rm -f "$_sens" "$_files" "$_roots"; trap - EXIT
    if [ -n "$_mismatch" ]; then
      echo "  ⚠ security flag vs vantry.yml sensitive_paths:"
      printf '%s\n' "$_mismatch"
    else
      echo "  ✓ every issue's security flag agrees with vantry.yml sensitive_paths"
    fi
  fi
fi

[ "$ERR" -eq 0 ] && echo "✓ backlog is workable." || echo "✗ backlog has problems (above) — fix them before importing."
exit "$ERR"
