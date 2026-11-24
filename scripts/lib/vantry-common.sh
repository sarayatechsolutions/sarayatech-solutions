#!/usr/bin/env bash
# ============================================================================
#  vantry-common.sh — shared helpers. bash 3.2 / macOS compatible.
#  SOURCED, never executed. No dependency beyond git, bash, sed/awk/grep.
#  jq and python3 are used when present, never required.
# ============================================================================

VANTRY_ROOT="${VANTRY_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
# When sourced from a hook the cwd may be anywhere: prefer the git toplevel.
if command -v git >/dev/null 2>&1; then
  _vt="$(git rev-parse --show-toplevel 2>/dev/null)"
  [ -n "$_vt" ] && VANTRY_ROOT="$_vt"
  unset _vt
fi
VANTRY_CFG="$VANTRY_ROOT/vantry.yml"
VANTRY_STATE="$VANTRY_ROOT/.vantry/state"

# ---------------------------------------------------------------- hashing
vantry_sha() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | cut -d' ' -f1
  elif command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1
  else cksum | cut -d' ' -f1; fi
}

# ---------------------------------------------- restricted-YAML config reader
#  Supported subset: flat keys, ONE level of 2-space nesting, "- item" lists.
#  No anchors, no multiline scalars, no inline objects. Validated by
#  scripts/validate-config.sh — anything richer is a design smell, not a gap.
#    vantry_cfg strictness standard      → top-level key
#    vantry_cfg run.smoke                → nested key
vantry_cfg() {
  local key="$1" def="${2:-}" top sub val
  [ -f "$VANTRY_CFG" ] || { printf '%s' "$def"; return 0; }
  case "$key" in
    *.*) top="${key%%.*}"; sub="${key#*.}" ;;
    *)   top="$key"; sub="" ;;
  esac
  if [ -z "$sub" ]; then
    val="$(awk -v k="$top" 'index($0, k":")==1 { sub("^" k ":[ \t]*", ""); print; exit }' "$VANTRY_CFG")"
  else
    val="$(awk -v t="$top" -v s="$sub" '
      index($0, t":")==1 && $0 ~ /:[ \t]*(#.*)?$/ { inb=1; next }
      inb && /^[^ \t#]/                           { inb=0 }
      inb && $0 ~ "^[ \t]+" s ":"                 { sub("^[ \t]+" s ":[ \t]*", ""); print; exit }
    ' "$VANTRY_CFG")"
  fi
  # YAML plain scalars end at " #". A value that must contain " #" gets quoted —
  # and a quoted value keeps everything up to its closing quote, verbatim.
  case "$val" in
    \"*) val="${val#\"}"; val="${val%%\"*}" ;;
    \'*) val="${val#\'}"; val="${val%%\'*}" ;;
    # A value that is ONLY a comment is not a value. `smoke:  # TODO` used to
    # parse as the command "# TODO", and `eval "# TODO"` exits 0 — so the gate
    # saw a declared smoke run, ran nothing, and PASSED. A silent false pass is
    # the exact failure this whole project exists to make impossible.
    \#*) val="" ;;
    # [[:space:]], never [ \t]: BSD sed reads \t inside a bracket expression as
    # the literal characters \ and t, so `[ \t]*$` silently ate the final "t" of
    # `strict` and of every command ending in `... test`.
    *)   val="$(printf '%s' "$val" | sed -e 's/[[:space:]][[:space:]]*#.*$//' -e 's/[[:space:]]*$//')" ;;
  esac
  # A quoted value gets no comment-stripping, which is correct — but it was also
  # never re-tested for emptiness. `smoke: "# TODO"` therefore parsed as the
  # command "# TODO", and eval on a comment exits 0: a declared smoke run that
  # executed nothing and PASSED. Same for a quoted run of spaces.
  # Wrong in both directions before this: `"# TODO"` was caught but `" # TODO"`
  # — one leading space — was not, and a legitimate command starting `#!` was
  # wrongly emptied. Trim first, and treat `#!` as executable, because it is.
  _t="$(printf '%s' "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  case "$_t" in
    '#!'*) : ;;                       # a shebang line is a command, not a comment
    '#'*)  val="" ;;
    '')    val="" ;;
  esac
  unset _t
  [ -z "$val" ] && val="$def"
  printf '%s' "$val"
}

vantry_cfg_list() {  # vantry_cfg_list sensitive_paths  → one item per line
  local key="$1"
  [ -f "$VANTRY_CFG" ] || return 0
  awk -v k="$key" '
    index($0, k":")==1 && $0 ~ /:[ \t]*(#.*)?$/ { inb=1; next }
    inb && /^[^ \t#-]/                          { inb=0 }
    inb && /^[ \t]*-[ \t]+/ {
      sub("^[ \t]*-[ \t]+", ""); sub("[ \t]*$", "")
      # A MATCHED pair only. Stripping either end independently ate a trailing
      # apostrophe from any item that legitimately ended in one.
      if (substr($0,1,1) == "\"" && substr($0,length($0),1) == "\"") $0 = substr($0, 2, length($0)-2)
      else if (substr($0,1,1) == "'"'"'" && substr($0,length($0),1) == "'"'"'") $0 = substr($0, 2, length($0)-2)
      if (length($0)) print
    }
  ' "$VANTRY_CFG"
}

# ------------------------------------------------------------- glob matching
#  Translate a gitignore-flavoured glob to an anchored ERE.
#    docs/**  → docs(/.*)?      **/auth/** → (.*/)?auth(/.*)?      *.md → [^/]*\.md
_vantry_glob_sed() {  # stdin: one glob per line → stdout: one ERE body per line
  # The '?' emitted by the ** rules must survive the glob '?' → '[^/]' rule,
  # so it travels as a placeholder and is restored last.
  sed -e 's#[][\\.^$+(){}|]#\\&#g' \
      -e 's#\*\*/#(@@ANY@@/)@@OPT@@#g' \
      -e 's#/\*\*#(/@@ANY@@)@@OPT@@#g' \
      -e 's#\*\*#@@ANY@@#g' \
      -e 's#\*#[^/]*#g' \
      -e 's#?#[^/]#g' \
      -e 's#@@ANY@@#.*#g' \
      -e 's#@@OPT@@#?#g'
}

vantry_glob_to_re() { printf '%s' "$1" | _vantry_glob_sed; }

vantry_glob_match() {  # $1 = path, $2 = glob
  printf '%s\n' "$1" | LC_ALL=C grep -qE "^$(vantry_glob_to_re "$2")$"
}

# ONE anchored ERE for a whole config list — ^(re1|re2|…)$ — or nothing when the
# list is empty. `|` inside a glob is escaped by _vantry_glob_sed, so joining on it
# cannot change what any single glob matches.
#
# Why this exists: matching path × glob one pair at a time cost ~3 processes per
# pair. vantry_changed_files ran that for EVERY changed file, and the Stop hook,
# SessionStart, PostToolUse, pre-push and every verify.sh call sit on top of it.
# On Windows a fork costs 30-70 ms, so 16 changed files took 30 s and one Stop-hook
# gate took 249 s (measured 11 Nov 2026). Same answers, three processes total.
vantry_list_re() {  # $1 = config list key
  local body
  body="$(vantry_cfg_list "$1" | _vantry_glob_sed | paste -sd'|' -)"
  [ -n "$body" ] && printf '^(%s)$' "$body"
  return 0
}

vantry_matches_list() {  # $1 = path, $2 = config list key
  local re
  re="$(vantry_list_re "$2")"
  [ -n "$re" ] || return 1
  printf '%s\n' "$1" | LC_ALL=C grep -qE -- "$re"
}

# A trivial file cannot change what the software DOES, so it never owes a
# verification. Everything not declared trivial is behavioral — deny by default.
vantry_is_trivial()   { vantry_matches_list "$1" trivial_paths; }
vantry_is_sensitive() { vantry_matches_list "$1" sensitive_paths; }

# vantry_sensitive_hits <diff args…>: the sensitive paths a `git diff` touches,
# one per line; rc 2 when git could not answer. CI used to split the name list
# on whitespace (`for f in $DIFF`) and let git quote non-ASCII names, so
# `.github/workflows/é.yml` or `a b.yml` never matched a pattern; and with
# rename detection a moved hook showed only its new, harmless name (#12).
#
# --also <file>: a second vantry.yml whose sensitive_paths count TOO. CI passes
# the base branch's copy: the list was read from the PR's own vantry.yml, so a
# PR deleting `.claude/hooks/**` from it exempted itself from review. A union
# can only add hits, never remove one.
vantry_sensitive_hits() {
  local out f re re2=""
  if [ "${1:-}" = "--also" ]; then
    re2="$(VANTRY_CFG="${2:-}" vantry_list_re sensitive_paths)"; shift 2 || return 2
  fi
  # --ignore-submodules=none: `submodule.<name>.ignore = all` (or the
  # diff.ignoreSubmodules setting) dropped a bumped submodule from the list.
  out="$(git -c core.quotepath=off diff --no-renames --ignore-submodules=none --name-only "$@")" || return 2
  re="$(vantry_list_re sensitive_paths)"
  printf '%s\n' "$out" | while IFS= read -r f; do
    [ -n "$f" ] || continue
    # Even with quotepath=off, git quotes a name holding `"`, `\` or a control
    # character, and `".github/workflows/x\"y.yml"` matches no pattern. Such a
    # name is listed as sensitive, unread: failing closed costs a review, never
    # a skipped one.
    case "$f" in '"'*) printf '%s\n' "$f"; continue ;; esac
    if { [ -n "$re" ] && printf '%s\n' "$f" | LC_ALL=C grep -qE -- "$re"; } \
       || { [ -n "$re2" ] && printf '%s\n' "$f" | LC_ALL=C grep -qE -- "$re2"; }; then
      printf '%s\n' "$f"
    fi
  done
  return 0
}

# vantry_review_drift [--also <cfg>] <base> <reviewed> <head>
#   The sensitive files whose state ON THIS BRANCH changed after a review made
#   at <reviewed>. CI used the two-dot diff <reviewed> <head>, which also lists
#   every sensitive file the BASE changed: merging the base after the review —
#   which the PR gate requires, and GitHub's "Update branch" does — turned a
#   correct verdict red and sent the author back to a full re-review of code
#   the branch never touched. A file is excused only when the branch changes it
#   at NEITHER point (equal to the base at the review, equal to the base now):
#   that is the base's own change, reviewed in its own PR. A file both sides
#   changed is listed — that combination is new and nobody has read it.
#   Exact comparison, mode and bytes: no whitespace folding (indentation is
#   meaning in YAML and Python). rc 2 when git cannot answer.
#
#   The candidates are the files that moved <reviewed> → <head> AND the files
#   the base moved between the two merge points. The first list alone missed a
#   merge that THREW AWAY the base's change: resolve the base's fix to a
#   sensitive file back to the old bytes (or a both-sides conflict to "ours")
#   and that file equals the reviewed commit again, so it was never looked at —
#   and merging the PR silently reverted a fix nobody re-reviewed.
vantry_review_drift() {
  local cfg="" base rh hd cands more mr mh f
  if [ "${1:-}" = "--also" ]; then cfg="${2:-}"; shift 2 || return 2; fi
  [ $# -eq 3 ] || return 2
  base="$1"; rh="$2"; hd="$3"
  mr="$(git merge-base "$base" "$rh" 2>/dev/null)" || return 2
  mh="$(git merge-base "$base" "$hd" 2>/dev/null)" || return 2
  if [ -n "$cfg" ]; then
    cands="$(vantry_sensitive_hits --also "$cfg" "$rh" "$hd")" || return 2
    more="$(vantry_sensitive_hits --also "$cfg" "$mr" "$mh")" || return 2
  else
    cands="$(vantry_sensitive_hits "$rh" "$hd")" || return 2
    more="$(vantry_sensitive_hits "$mr" "$mh")" || return 2
  fi
  cands="$(printf '%s\n%s\n' "$cands" "$more" | LC_ALL=C sort -u)"
  [ -n "$cands" ] || return 0
  printf '%s\n' "$cands" | while IFS= read -r f; do
    [ -n "$f" ] || continue
    # A name git had to quote cannot be looked up as written: fail closed.
    case "$f" in '"'*) printf '%s\n' "$f"; continue ;; esac
    if ! _vantry_touches "$mr" "$rh" "$f" && ! _vantry_touches "$mh" "$hd" "$f"; then
      continue
    fi
    printf '%s\n' "$f"
  done
  return 0
}
_vantry_touches() {  # does $1 → $2 change path $3 (mode or bytes)? an error counts as yes
  git diff --quiet --no-renames --no-ext-diff --no-textconv --ignore-submodules=none \
      "$1" "$2" -- ":(literal)$3" >/dev/null 2>&1
  [ $? -ne 0 ]
}

# ------------------------------------------------------- identity of the work
vantry_slug() {
  local b
  b="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  if [ -z "$b" ] || [ "$b" = "HEAD" ]; then b="detached-$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"; fi
  printf '%s' "$b" | tr '/' '-' | tr -cd 'A-Za-z0-9._-'
}

# ------------------------------------------------------------- the changeset
#  Everything is measured against the BASE the work will merge into — never
#  against HEAD. Diffing HEAD would make `git commit` erase the changeset, so a
#  receipt earned before the commit would still be "valid" after ten more
#  commits. Against the base, committing changes nothing: the content is the
#  same, so the receipt survives the commit and dies on the next EDIT.
vantry_base_ref() {
  local b
  b="$(vantry_cfg merge.base)"
  if [ -z "$b" ]; then
    b="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')"
  fi
  # On a pull_request run GitHub sets GITHUB_BASE_REF to the base branch. It is
  # the most authoritative answer available in CI, and it costs nothing to use.
  [ -z "$b" ] && b="${GITHUB_BASE_REF:-}"
  [ -z "$b" ] && b="main"
  printf '%s' "$b"
}

# Does the configured base actually exist? Silently falling back to HEAD made
# the changeset empty on any trunk not named `main`, so a repo on `develop` or
# `master` with no origin reported "verdict: OK" and enforced nothing on
# committed work — while --status printed a base sha that was really just HEAD.
vantry_base_resolves() {
  local b r
  b="$(vantry_base_ref)"
  # `refs/remotes/origin/$b` is listed explicitly because a shallow CI checkout
  # can hold the remote ref without a local branch of the same name.
  for r in "origin/$b" "refs/remotes/origin/$b" "$b" "refs/heads/$b"; do
    git rev-parse --verify --quiet "$r" >/dev/null 2>&1 && return 0
  done
  return 1
}

# vantry_published <commit> — is this commit already on a branch the remote
# only takes through a pull request: the configured base, or the remote's
# default branch? Pushing such a commit elsewhere (fast-forwarding develop to
# main, say) publishes no code that has not already been through CI. A commit
# that is merely on SOME remote branch does not qualify: a feature branch
# pushed earlier is on the remote too, and was never verified for that.
vantry_published() {
  local c="$1" r d
  case "$c" in ""|-*) return 1 ;; esac
  d="$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null)"
  for r in "refs/remotes/origin/$(vantry_base_ref)" "${d:+refs/remotes/$d}"; do
    [ -n "$r" ] || continue
    git rev-parse -q --verify "$r^{commit}" >/dev/null 2>&1 || continue
    git merge-base --is-ancestor "$c" "$r" 2>/dev/null && return 0
  done
  return 1
}

# The commit the changeset is measured FROM. VANTRY_REF lets pre-push judge a
# branch it is not standing on — without it the hook gated the checked-out tree
# and any other ref in the same push went out unexamined.
vantry_tip() { printf '%s' "$(git rev-parse "${VANTRY_REF:-HEAD}" 2>/dev/null || git rev-parse HEAD 2>/dev/null)"; }

vantry_base_point() {
  local b r mb="" tip
  b="$(vantry_base_ref)"
  tip="$(vantry_tip)"
  for r in "origin/$b" "$b"; do
    git rev-parse --verify --quiet "$r" >/dev/null 2>&1 || continue
    mb="$(git merge-base "$tip" "$r" 2>/dev/null)"
    [ -n "$mb" ] && break
  done
  [ -z "$mb" ] && mb="$tip"
  printf '%s' "$mb"
}

# Can this gate see committed work at all? When the base point is HEAD itself —
# you are standing on the trunk and no `origin/<trunk>` exists to measure unpushed
# commits against — `git diff <base>` can only report uncommitted files. The gate
# is then structurally blind to anything already committed, which is NOT the same
# as "nothing changed", and printing the same silent 0 for both is how a gate
# looks armed while seeing nothing.
vantry_gate_blind() {
  local b
  b="$(vantry_base_ref)"
  git rev-parse --verify --quiet "origin/$b" >/dev/null 2>&1 && return 1
  [ "$(vantry_base_point)" = "$(git rev-parse HEAD 2>/dev/null)" ] || return 1
  git rev-parse --verify --quiet HEAD >/dev/null 2>&1 || return 1   # no commits yet: nothing to be blind to
  return 0
}

# Where the changeset starts: the base point, unless the tip is already on the
# base or the remote's default branch. Then it publishes nothing new, and only
# what sits on top of it (uncommitted work) is pending. Without this, `develop`
# fast-forwarded to a `main` that had just taken a merged pull request listed
# every file of that PR — code its CI had passed — and both the end of the turn
# and `git push origin develop` were refused until someone re-verified it.
vantry_change_base() {
  local tip
  tip="$(vantry_tip)"
  if [ -n "$tip" ] && vantry_published "$tip"; then printf '%s' "$tip"; return 0; fi
  vantry_base_point
}

# The non-trivial files this branch changes — committed OR not.
vantry_changed_files() {
  local base re
  base="$(vantry_change_base)"
  re="$(vantry_list_re trivial_paths)"
  {
    if [ -n "${VANTRY_REF:-}" ]; then
      # Judging another branch: its changeset is base..<that branch>, committed
      # only. The working tree belongs to whatever IS checked out and says
      # nothing about the ref being pushed.
      [ -n "$base" ] && git -c core.quotepath=off diff --no-renames --ignore-submodules=none --name-only "$base" "$(vantry_tip)" 2>/dev/null
    else
      # --no-renames (#11): with rename detection, deleting a file and adding a
      # near-copy listed only the new name — the deletion was never fingerprinted,
      # so it could happen after verification with the receipt still current.
      # --ignore-submodules=none (#13): `submodule.<name>.ignore = all` hid a
      # submodule bump from this list, so the digest never looked at it.
      [ -n "$base" ] && git -c core.quotepath=off diff --no-renames --ignore-submodules=none --name-only "$base" 2>/dev/null
      git -c core.quotepath=off ls-files --others --exclude-standard 2>/dev/null
    fi
  } | LC_ALL=C sort -u \
    | LC_ALL=C grep -v -e '^$' -e '^\.vantry/' \
    | { if [ -n "$re" ]; then LC_ALL=C grep -vE -- "$re"; else cat; fi; } || true
  # .vantry/ is EVIDENCE, never source. Without that filter the receipt is part
  # of its own digest: verify.sh writes it, the digest changes, and the receipt
  # is stale the instant it exists. The kit only tested green on itself
  # because its own .gitignore hides .vantry/ — every adopted repo, whose
  # .gitignore the installer never touched, got a permanently blocked gate.
  # Correctness cannot depend on a file the user owns.
  # Trivial paths are dropped in ONE grep against the compiled list (see
  # vantry_list_re), not one subprocess chain per file.
  # core.quotepath=off: by default git prints `café.sh` as "caf\303\251.sh",
  # no file has that name, and both digests recorded it as DELETED — so the
  # file could be edited after verification and nothing noticed. A name git
  # STILL quotes (a `"`, a backslash, a control character) is refused by the
  # digest, never guessed at.
  # LC_ALL=C on every filter: with quoting off, a name that is not valid UTF-8
  # reaches them raw, and GNU grep under a UTF-8 locale drops that line as
  # "binary" — the file left both digests, and alone it left the gate with
  # nothing to ask a receipt for.
}

# How many non-trivial files changed — the number every gate tests for zero.
# LC_ALL=C: under a UTF-8 locale grep's `.` matches no byte that is invalid
# UTF-8, so a change whose names were all such bytes counted 0 and the gate
# answered "nothing to verify" without reading a receipt. Git Bash exports
# LANG=en_US.UTF-8 in every login shell.
vantry_changed_count() {
  vantry_changed_files | LC_ALL=C grep -c . || true
}

# The mode of a repo-relative path: 100755 or 100644. On Windows the filesystem
# has no executable bit — Git Bash reports every `#!` file as executable — so the
# only truth is the mode git recorded in the index (a new file: 100644), and
# `[ -x ]` alone wrote 100755 where the commit said 100644: the receipt could
# never match the ref pre-push digests. Everywhere else the disk IS the truth.
# Decided by the platform, never by core.filemode: that key can be set through
# GIT_CONFIG_* without touching a file, and on POSIX it let `update-index
# --chmod=-x` record a 755 hook as 644 — a hook every clone then ignores — with
# the receipt still current.
# Read from uname when this file is sourced — never taken from the environment:
# `${_VANTRY_UNAME:=…}` let `_VANTRY_UNAME=MINGW64 git push` on Linux switch the
# mode source back to the index.
_VANTRY_UNAME="$(uname -s 2>/dev/null)"
vantry_filemode_trusted() {
  case "$_VANTRY_UNAME" in MINGW*|MSYS*|CYGWIN*) return 1 ;; esac
  return 0
}
vantry_file_mode() {
  local m
  if vantry_filemode_trusted; then
    if [ -L "$VANTRY_ROOT/$1" ]; then printf '120000'
    elif [ -x "$VANTRY_ROOT/$1" ]; then printf '100755'; else printf '100644'; fi
  else
    # 120000: with core.symlinks=false a symlink is checked out as a plain file
    # holding its target, and the index still records it as a link.
    m="$(git -C "$VANTRY_ROOT" --literal-pathspecs ls-files -s -- "$1" 2>/dev/null | awk 'NR==1{print $1}')"
    case "$m" in 100755|100644|120000) printf '%s' "$m" ;; *) printf '100644' ;; esac
  fi
}

# The content id git WILL STORE for a repo-relative path: `git hash-object`
# applies the path's clean filters and eol conversion. Hashing the bytes on disk
# instead made a CRLF checkout (core.autocrlf=true, the Git for Windows default)
# digest differently from the LF blob pre-push reads, so a verified branch was
# refused at push. A pure line-ending difference no longer moves the digest —
# git itself considers the two identical.
#
# Line endings only. A clean filter, `ident` or `working-tree-encoding` can be
# switched on from git config or .git/info/attributes — outside the tree, outside
# the digest — and `hash-object` would then fingerprint what the FILTER writes,
# not the bytes that were tested: the receipt and pre-push agreed on code nobody
# ran. Those paths are hashed raw (`--no-filters`): an honest filter makes the
# receipt mismatch and the gate block, which is what the old byte hash did.
# _vantry_filtered_paths: paths on stdin (one per line) → those with any of the
# three attributes set, from every source git reads attributes from.
# check-attr prints `unset` and `unspecified` both for "no attribute" and for a
# driver NAMED that (`filter=unset`), so the value alone cannot clear a path: one
# whose filter names a driver with a configured `clean` or `process` command is
# filtered, whatever the driver is called.
_vantry_filtered_paths() {
  local drivers
  drivers="$(cd "$VANTRY_ROOT" && git config --name-only --get-regexp '^filter\..*\.(clean|process)$' 2>/dev/null \
    | awk '{ sub(/^filter\./, ""); sub(/\.(clean|process)$/, ""); print }')"
  (cd "$VANTRY_ROOT" && tr '\n' '\0' | git check-attr -z --stdin filter ident working-tree-encoding 2>/dev/null) \
    | tr '\0' '\n' | VANTRY_DRIVERS="$drivers" awk '
        BEGIN { n = split(ENVIRON["VANTRY_DRIVERS"], d, "\n"); for (j = 1; j <= n; j++) drv[d[j]] = 1 }
        NR%3==1 { p = $0 } NR%3==2 { a = $0 }
        NR%3==0 && (($0 != "unspecified" && $0 != "unset") || (a == "filter" && ($0 in drv))) { print p }' \
    | LC_ALL=C sort -u
}
vantry_blob_id() {
  if [ -L "$VANTRY_ROOT/$1" ]; then   # git stores a symlink as its target, unfiltered
    _vantry_link_id "$1"; return
  fi
  if [ -n "$(printf '%s\n' "$1" | _vantry_filtered_paths)" ]; then
    (cd "$VANTRY_ROOT" && git hash-object --no-filters -- "$1" 2>/dev/null)
  else
    (cd "$VANTRY_ROOT" && git hash-object -- "$1" 2>/dev/null)
  fi
}

# The blob id git stores for a symlink: its target, as bytes, never what it
# points at. Hashing the path followed the link, so retargeting a link between
# two missing files read "DELETED" both times and the receipt stayed current.
_vantry_link_id() {
  local t
  t="$(readlink -- "$VANTRY_ROOT/$1" 2>/dev/null)" || return 0
  [ -n "$t" ] || return 0
  printf '%s' "$t" | git hash-object --stdin 2>/dev/null
}

# A submodule's commit, as the gitlink records it: the submodule's HEAD when it
# is checked out (nothing when it has local changes — they are not in any
# commit), else the commit the index records.
_vantry_gitlink_id() {
  local d="$VANTRY_ROOT/$1" st
  if [ -e "$d/.git" ]; then
    # Explicit flags: the submodule's own config (status.showUntrackedFiles=no,
    # an ignore setting on a nested submodule) must not make it read clean.
    st="$(git -C "$d" status --porcelain --ignore-submodules=none --untracked-files=normal 2>/dev/null)" || return 0
    [ -z "$st" ] || return 0
    git -C "$d" rev-parse --verify --quiet HEAD 2>/dev/null
  else
    git -C "$VANTRY_ROOT" --literal-pathspecs ls-files -s -- "$1" 2>/dev/null \
      | awk '$1=="160000"{print $2; exit}'
  fi
}

# The fingerprint that makes a receipt STALE the moment the code changes again.
#
# Both sides digest the SAME thing — what git stores — as "<blob id> <mode> <path>"
# or "DELETED <path>", in changeset order. Content AND mode: hashing content alone
# meant `chmod -x` on a hook left the receipt CURRENT while git recorded
# 100755 -> 100644, so a gate could be made non-executable after it was verified.
vantry_tree_digest() {
  local f tip m ty id rest
  [ -z "${VANTRY_REF:-}" ] && { _vantry_worktree_digest_lines | vantry_sha; return 0; }
  # Pre-push: the file AS IT IS ON THAT REF, never as it is in this worktree —
  # blob id and mode exactly as git recorded them.
  tip="$(vantry_tip)"
  vantry_changed_files | while IFS= read -r f; do
    case "$f" in   # a name git had to quote: see _vantry_worktree_digest_lines
      *\\*|*'	'*|'"'*) printf 'UNFINGERPRINTABLE %s %s\n' "$$-$RANDOM$RANDOM" "$f"; continue ;;
    esac
    m=""; id=""
    read -r m ty id rest <<EOF
$(git --literal-pathspecs ls-tree "$tip" -- "$f" 2>/dev/null)
EOF
    # A submodule is a gitlink: type `commit`, mode 160000. It read as DELETED
    # on both sides, so bumping it after verification left the receipt current (#13).
    if { [ "$ty" = "blob" ] || [ "$ty" = "commit" ]; } && [ -n "$id" ]; then printf '%s %s %s\n' "$id" "$m" "$f"
    else printf 'DELETED %s\n' "$f"; fi
  done | vantry_sha
}

# The working-tree half of vantry_tree_digest: every present file is hashed by ONE
# `git hash-object --stdin-paths` and every mode read from ONE `git ls-files -s`,
# instead of a hasher start-up (a Perl `shasum` on Windows) per changed file.
# Each path is classified ONCE, so a file created or deleted between two `[ -f ]`
# tests cannot shift every later id onto the wrong path:
#   B  present, hashed in the batch      D  absent: "DELETED <path>"
#   L  a symlink: its target, mode 120000 S  a submodule: its commit, mode 160000
#   Q  a name git still quoted under core.quotepath=off (`"`, backslash, control
#      character). No batch tool can be trusted with it, nor a guess at
#      unquoting it, and "DELETED" is exactly what let an edit go unseen. It gets
#      a fingerprint that never repeats: no receipt is current until it is renamed.
_vantry_worktree_digest_lines() {
  local f i=0 k=0 n=0 line id exact=1 trusted=1 filtered="" nonce="" nl='
'
  local -a all kind batch hashes bmodes
  all=(); kind=(); batch=(); hashes=(); bmodes=()
  while IFS= read -r f; do [ -n "$f" ] && { all[n]="$f"; n=$((n + 1)); }; done <<EOF
$(vantry_changed_files)
EOF
  # bash 3.2 under `set -u` calls an empty "${all[@]}" unbound — and an empty
  # changeset digests to the hash of nothing.
  [ "$n" -gt 0 ] || return 0
  vantry_filemode_trusted || trusted=0
  for f in "${all[@]}"; do
    case "$f" in
      *\\*|*'
'*|*'	'*|'"'*) kind[k]=Q ;;
      *) if [ -L "$VANTRY_ROOT/$f" ]; then kind[k]=L
         elif [ -f "$VANTRY_ROOT/$f" ]; then kind[k]=B; batch[${#batch[@]}]="$f"
         elif [ -d "$VANTRY_ROOT/$f" ]; then kind[k]=S
         else kind[k]=D; fi ;;
    esac
    k=$((k + 1))
  done
  if [ "${#batch[@]}" -gt 0 ]; then
    while IFS= read -r line; do hashes[i]="$line"; i=$((i + 1)); done <<EOF
$(cd "$VANTRY_ROOT" && printf '%s\n' "${batch[@]}" | git hash-object --stdin-paths 2>/dev/null)
EOF
    # One id per file or nothing is trusted: a file that produced no line would
    # shift every later id onto the wrong path.
    [ "$i" -eq "${#batch[@]}" ] || exact=0
    filtered="$(printf '%s\n' "${batch[@]}" | _vantry_filtered_paths)"
    if [ "$trusted" -eq 0 ] && [ "$exact" -eq 1 ]; then
      # Index modes, re-ordered to the batch by awk (no associative arrays in
      # bash 3.2); a path absent from the index is new, and git records 100644.
      i=0
      while IFS= read -r line; do bmodes[i]="$line"; i=$((i + 1)); done <<EOF
$( { (cd "$VANTRY_ROOT" && git --literal-pathspecs -c core.quotepath=off ls-files -s -- "${batch[@]}" 2>/dev/null) | sed 's/^/I /'
     printf 'F %s\n' "${batch[@]}"; } |
   awk '$1=="I"{t=index($0,"\t"); p=substr($0,t+1); split(substr($0,3,t-3),a," "); m[p]=a[1]; next}
        {p=substr($0,3); x=m[p]; print ((x=="100755"||x=="100644"||x=="120000")?x:"100644")}')
EOF
      [ "$i" -eq "${#batch[@]}" ] || exact=0
    fi
  fi
  i=0; k=0
  for f in "${all[@]}"; do
    case "${kind[k]}" in
      D) printf 'DELETED %s\n' "$f" ;;
      Q) [ -n "$nonce" ] || nonce="$(date +%s 2>/dev/null)-$$-$RANDOM$RANDOM"
         echo "vantry: cannot fingerprint $f — rename it; until then no receipt can be current" >&2
         printf 'UNFINGERPRINTABLE %s %s\n' "$nonce" "$f" ;;
      L) id="$(_vantry_link_id "$f")"
         if [ -n "$id" ]; then printf '%s 120000 %s\n' "$id" "$f"
         else
           [ -n "$nonce" ] || nonce="$(date +%s 2>/dev/null)-$$-$RANDOM$RANDOM"
           echo "vantry: cannot read the symlink $f — until it can, no receipt can be current" >&2
           printf 'UNFINGERPRINTABLE %s %s\n' "$nonce" "$f"
         fi ;;
      S) id="$(_vantry_gitlink_id "$f")"
         if [ -n "$id" ]; then printf '%s 160000 %s\n' "$id" "$f"
         elif [ -e "$VANTRY_ROOT/$f/.git" ]; then
           [ -n "$nonce" ] || nonce="$(date +%s 2>/dev/null)-$$-$RANDOM$RANDOM"
           echo "vantry: submodule $f has changes no commit records — commit them there; until then no receipt can be current" >&2
           printf 'UNFINGERPRINTABLE %s %s\n' "$nonce" "$f"
         else printf 'DELETED %s\n' "$f"; fi ;;
      *) if [ "$exact" -eq 0 ]; then
           id="$(vantry_blob_id "$f")"; line="$(vantry_file_mode "$f")"
         else
           id="${hashes[i]:-}"
           case "$nl$filtered$nl" in
             *"$nl$f$nl"*) id="$(cd "$VANTRY_ROOT" && git hash-object --no-filters -- "$f" 2>/dev/null)" ;;
           esac
           if [ "$trusted" -eq 0 ]; then line="${bmodes[i]:-}"
           elif [ -x "$VANTRY_ROOT/$f" ]; then line=100755; else line=100644; fi
         fi
         # git could not hash it (unreadable, a failing filter): an empty id
         # repeats on every run, so its edits would never move the digest.
         if [ -z "$id" ]; then
           [ -n "$nonce" ] || nonce="$(date +%s 2>/dev/null)-$$-$RANDOM$RANDOM"
           echo "vantry: git could not hash $f — until it can, no receipt can be current" >&2
           printf 'UNFINGERPRINTABLE %s %s\n' "$nonce" "$f"
         else
           printf '%s %s %s\n' "$id" "$line" "$f"
         fi
         i=$((i + 1)) ;;
    esac
    k=$((k + 1))
  done
  _vantry_index_flag_lines
}

# Index flags. skip-worktree and assume-unchanged tell git to stop looking at a
# file on disk: `git diff` — so vantry_changed_files — never lists it, and
# `git commit -a` never takes it. Edited behind such a flag, the file that was
# verified is not the file git commits, and no digest moved. Every flagged file
# whose disk content differs from its index blob gets a fingerprint that never
# repeats, until the flag is cleared. A flagged file absent from disk is a
# sparse checkout doing its job: there is nothing on disk to diverge. Called
# only when the changeset is not empty — an empty one needs no receipt.
_vantry_index_flag_lines() {
  local f re line i=0 nonce="" w="" div="" tab='	' nl='
'
  local -a reg ids names
  reg=(); ids=(); names=()
  re="$(vantry_list_re trivial_paths)"
  while IFS= read -r f; do
    case "$f" in
      '') continue ;;
      '"'*) div="$div$f$nl"; continue ;;   # a name git still quotes: not checkable
    esac
    if [ -L "$VANTRY_ROOT/$f" ]; then
      names[${#names[@]}]="$f"; w="${w}W $(_vantry_link_id "$f")$tab$f$nl"
    elif [ -f "$VANTRY_ROOT/$f" ]; then
      names[${#names[@]}]="$f"; reg[${#reg[@]}]="$f"
    fi
  done <<EOF
$(cd "$VANTRY_ROOT" && git -c core.quotepath=off ls-files -v 2>/dev/null \
   | LC_ALL=C sed -n 's/^[Sa-z] //p' | LC_ALL=C grep -v '^\.vantry/' \
   | { if [ -n "$re" ]; then LC_ALL=C grep -vE -- "$re"; else cat; fi; })
EOF
  if [ "${#reg[@]}" -gt 0 ]; then
    while IFS= read -r line; do [ -n "$line" ] && { ids[i]="$line"; i=$((i + 1)); }; done <<EOF
$(cd "$VANTRY_ROOT" && printf '%s\n' "${reg[@]}" | git hash-object --stdin-paths 2>/dev/null)
EOF
    # One id per file, or none is trusted: an empty id never equals a blob.
    [ "$i" -eq "${#reg[@]}" ] || ids=()
    i=0
    for f in "${reg[@]}"; do w="${w}W ${ids[i]:-}$tab$f$nl"; i=$((i + 1)); done
  fi
  if [ "${#names[@]}" -gt 0 ]; then
    div="$div$( { (cd "$VANTRY_ROOT" && git --literal-pathspecs -c core.quotepath=off ls-files -s -- "${names[@]}" 2>/dev/null) | sed 's/^/I /'
                  printf '%s' "$w"; } |
      awk '$1=="I"{t=index($0,"\t"); p=substr($0,t+1); split(substr($0,3,t-3),a," "); b[p]=a[2]; next}
           {t=index($0,"\t"); p=substr($0,t+1); id=substr($0,3,t-3); if (id=="" || b[p]!=id) print p}')"
  fi
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    [ -n "$nonce" ] || nonce="$(date +%s 2>/dev/null)-$$-$RANDOM$RANDOM"
    echo "vantry: $f is marked skip-worktree/assume-unchanged and differs from what git will commit — clear the flag (git update-index --no-skip-worktree --no-assume-unchanged); until then no receipt can be current" >&2
    printf 'UNFINGERPRINTABLE %s %s\n' "$nonce" "$f"
  done <<EOF
$div
EOF
}

# ------------------------------------------------------------ receipt sealing
# "An agent cannot produce this file" was the product thesis, and it was false:
# one heredoc wrote a receipt with produced_by:"totally-not-verify.sh", steps:[]
# and the right tree_digest, and every gate accepted it. The digest proves WHICH
# CODE was judged; nothing proved the judging ever happened.
#
# The seal is a keyed hash over the receipt's own claims, using a machine-local
# key that is never committed and never leaves .vantry/state/. Writing the JSON
# is no longer enough; you must read the key, and reading the key to forge a
# receipt stops being a mistake and becomes a decision — which is the line that
# matters. Receipts are already machine-local (gitignored), so a per-machine key
# costs nothing: a fresh clone has no receipts to validate anyway.
vantry_seal_key() {
  local k="$VANTRY_ROOT/.vantry/state/seal.key"
  if [ ! -s "$k" ]; then
    mkdir -p "$(dirname "$k")" 2>/dev/null || return 1
    # Restrict the EMPTY file first, then write the secret into it: a truncating
    # write keeps the file's permissions, so the key is never readable by others,
    # not even for the instant between writing and chmod.
    : > "$k" 2>/dev/null || return 1
    chmod 600 "$k" 2>/dev/null
    # macOS: an ACL inherited from the folder survives chmod 600 (ls shows `+`).
    case "$_VANTRY_UNAME" in Darwin) chmod -N "$k" 2>/dev/null ;; esac
    # On Windows the ACL is the only protection: not restricted, no secret.
    _vantry_owner_only "$k" || {
      rm -f "$k"
      echo "vantry: could not restrict $k to this account — no seal key, so no receipt is accepted" >&2
      return 1
    }
    { head -c 32 /dev/urandom 2>/dev/null | od -An -tx1 | tr -d ' \n'; } > "$k" 2>/dev/null
    # No randomness, no key. The old fallback ("$$-vantry-fallback") was a key
    # anyone could guess; without a key the seal check refuses (vantry_seal_ok).
    [ -s "$k" ] || { rm -f "$k"; return 1; }
    : > "$k.owner-only" 2>/dev/null
  elif [ ! -e "$k.owner-only" ]; then
    # A key created before the ACL fix kept its folder's ACL — readable, even
    # writable, by every local account — and nothing ever restricted it. Once.
    chmod 600 "$k" 2>/dev/null
    case "$_VANTRY_UNAME" in Darwin) chmod -N "$k" 2>/dev/null ;; esac
    if _vantry_owner_only "$k"; then : > "$k.owner-only" 2>/dev/null
    else
      echo "vantry: $k is open to other accounts and could not be restricted — delete it, then re-run scripts/verify.sh" >&2
      return 1
    fi
  else
    # The marker records that the key WAS restricted once. Outside Windows the
    # mode is one `ls` away, so it is read again on every use instead of
    # trusted: a `chmod 644`, a copy under a loose umask or a restore from
    # backup widens it silently (#14). A key that was readable may have been
    # read, so it is refused, not quietly narrowed again. On Windows the ACL
    # check costs two process launches, and it stays a one-off (residual risk
    # in docs/security/threat-models/receipt-integrity.md).
    case "$_VANTRY_UNAME" in
      MINGW*|MSYS*|CYGWIN*) ;;
      *) _vantry_owner_only "$k" || {
           echo "vantry: $k is readable by other accounts, so it may have leaked — delete it, then re-run scripts/verify.sh" >&2
           return 1; } ;;
    esac
  fi
  [ -f "$k" ] || return 1
  cat "$k"
}

# chmod is a no-op on Git for Windows / MSYS / Cygwin mounts (noacl): the key
# inherited its folder's ACL and was readable — and writable — by every local
# account (verified with icacls: BUILTIN\Users (RX), Authenticated Users (M)).
# Drop inheritance and grant the current account alone. It does not stop a
# process running AS this account; that is not the threat the key covers.
# Returns non-zero unless Windows then reports exactly one entry, none of it
# inherited — the old version returned 0 when icacls or %USERNAME% was missing,
# and the caller recorded the key as restricted when nothing had been done.
# The account is named by its SID, from Windows' own whoami.exe (MSYS ships a
# coreutils `whoami` that shadows it), and both tools are found through the
# system directory Windows reports, not through PATH.
_vantry_owner_only() {
  local sys w sid acl
  case "$_VANTRY_UNAME" in
    MINGW*|MSYS*|CYGWIN*) ;;
    *) # Elsewhere chmod 600 IS the restriction — and it was assumed, not read
       # back: on a filesystem that ignores modes (a FAT or noacl mount) the key
       # stayed readable by every account (#14). Read what the filesystem says.
       # A `+` after the mode means an ACL, which chmod 600 leaves in place and
       # which can grant other accounts read: only a space, `.` (an SELinux
       # label) or `@` (macOS extended attributes) may follow. This only reads;
       # the callers that restrict (creation, the one-off upgrade) also drop a
       # macOS ACL with chmod -N first.
       case "$(LC_ALL=C ls -ld -- "$1" 2>/dev/null)" in -rw-------[[:space:].@]*) return 0 ;; esac
       return 1 ;;
  esac
  sys="$(cygpath -S 2>/dev/null)" && w="$(cygpath -w "$1" 2>/dev/null)" || return 1
  # MSYS rewrites any argument starting with "/" into a Windows path; the
  # switches must reach whoami and icacls verbatim.
  sid="$(MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' "$sys/whoami.exe" /user /fo csv /nh 2>/dev/null \
        | LC_ALL=C sed -n 's/.*"\(S-1-[0-9-]*\)".*/\1/p')"
  case "$sid" in S-1-*) ;; *) return 1 ;; esac
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' \
    "$sys/icacls.exe" "$w" /inheritance:r /grant:r "*$sid:(R,W)" >/dev/null 2>&1 || return 1
  acl="$(MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' "$sys/icacls.exe" "$w" 2>/dev/null)" || return 1
  [ "$(printf '%s\n' "$acl" | grep -c ':(')" = "1" ] && ! printf '%s\n' "$acl" | grep -q '(I)'
}

# The sealed claims, in a fixed order. Deliberately NOT the whole file:
# --observe annotates a receipt after the fact and must not have to re-seal a
# run it did not perform.
vantry_seal_payload() {
  local r="$1"
  # SEAL THE DOCUMENT, NOT A SELECTION OF FIELDS.
  #
  # This used to hash five chosen fields — verdict, tree_digest, created_at,
  # head, produced_by. Everything else was unsealed, and three of those
  # unsealed fields DECIDE THE GATE:
  #
  #   · `kind`       — one sed turned a deployment smoke, which skips test and
  #                    build, into a full verification. Reproduced: rc=0.
  #   · `steps`      — the "a pass with no steps" check reads it.
  #   · `acceptance` — a failed criterion could be rewritten to "pass" while
  #                    still naming the requirement it did not prove.
  #
  # Choosing which fields matter was the error: the next field added to the
  # receipt would have been unsealed too, silently. So: everything EXCEPT
  # `observation` (which --observe legitimately writes afterwards) and `seal`
  # itself. Canonical JSON — sorted keys, no whitespace — so re-serialisation
  # cannot change the hash.
  if command -v python3 >/dev/null 2>&1; then
    python3 -c '
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
d.pop("seal", None)
d.pop("observation", None)
sys.stdout.write(json.dumps(d, sort_keys=True, separators=(",", ":")))
' "$r" 2>/dev/null && return 0
  fi
  # Fallback: the file with the two mutable lines removed. Weaker than canonical
  # JSON — it is sensitive to formatting — but it still covers every field the
  # gate reads, which the old five-field payload did not.
  grep -v '"seal"' "$r" 2>/dev/null | grep -v '"observation"'
}

# HMAC-SHA256 (RFC 2104) with the key kept off every command line. `openssl dgst
# -hmac <key>` put the seal key in argv, readable by any local account (ps,
# /proc/<pid>/cmdline) while openssl ran (#14). Here the key only ever reaches a
# pipe: the pads are built by the printf builtin, and openssl hashes stdin.
_vantry_hmac_sha256() {  # $1 = key, $2 = message → 64 hex chars, or nothing
  local khex b i=0 ipad="" opad=""
  khex="$(printf '%s' "$1" | od -An -v -tx1 | tr -d ' \n')"   # -v: never fold repeats into "*"
  if [ "${#khex}" -gt 128 ]; then   # a key longer than the block is hashed first
    khex="$(printf '%s' "$1" | openssl dgst -sha256 2>/dev/null | sed 's/.*= *//' | tr -d '[:space:]')"
  fi
  case "$khex" in *[!0-9a-f]*) return 1 ;; esac
  while [ "${#khex}" -lt 128 ]; do khex="${khex}00"; done
  while [ "$i" -lt 128 ]; do
    b=$((16#${khex:i:2}))
    printf -v ipad '%s%s%02x' "$ipad" '\x' $((b ^ 0x36))
    printf -v opad '%s%s%02x' "$opad" '\x' $((b ^ 0x5c))
    i=$((i + 2))
  done
  { printf '%b' "$opad"; { printf '%b' "$ipad"; printf '%s' "$2"; } | openssl dgst -sha256 -binary 2>/dev/null; } \
    | openssl dgst -sha256 2>/dev/null | sed 's/.*= *//' | tr -d '[:space:]'
}

vantry_seal_compute() {   # $1 = payload string → 64 hex chars, or nothing
  local key out; key="$(vantry_seal_key)" || return 1
  [ -n "$key" ] || return 1
  if command -v openssl >/dev/null 2>&1; then
    # openssl prints "HMAC-SHA2-256(stdin)= <hex>" on OpenSSL 3 and bare hex on
    # some LibreSSL builds. Take whatever follows the last "= ", then INSIST it
    # looks like a digest: an openssl that exists but fails wrote an empty seal,
    # and an empty seal read as "forged" — so a machine with a broken openssl
    # blocked its own gate forever with a message about forgery.
    out="$(_vantry_hmac_sha256 "$key" "$1")"
  fi
  case "$out" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f]*) : ;;
    *) out="$(printf '%s%s%s' "$key" "$1" "$key" | vantry_sha)" ;;
  esac
  case "$out" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f]*) printf '%s' "$out" ;;
    *) return 1 ;;                      # this machine cannot hash at all
  esac
}

# 0 = the seal matches · 1 = it does not · 2 = cannot tell on this machine
#
# The distinction is the whole design. A machine that CAN seal and finds a
# receipt with a wrong or absent seal has caught a forgery and must block. A
# machine that cannot seal at all (no key, no sha tool — a fresh clone, a
# stripped container) knows nothing and must NOT convert its own ignorance into
# an accusation: it degrades to the pre-seal behaviour and says so.
_vantry_can_hash() {
  local out=""
  command -v openssl >/dev/null 2>&1 \
    && out="$(printf 'probe' | openssl dgst -sha256 -hmac probe 2>/dev/null | sed 's/.*= *//' | tr -d '[:space:]')"
  case "$out" in [0-9a-f][0-9a-f][0-9a-f][0-9a-f]*) return 0 ;; esac
  case "$(printf 'probe' | vantry_sha 2>/dev/null)" in [0-9a-f][0-9a-f][0-9a-f][0-9a-f]*) return 0 ;; esac
  return 1
}

vantry_seal_ok() {
  local r="$1" have want
  # DO NOT return "cannot tell" merely because the key file is absent. That was
  # the hole: deleting .vantry/state/seal.key turned every forged receipt into an
  # unverifiable one, and unverifiable was being treated as acceptable. An
  # attacker who can write a receipt can also delete a file.
  #
  # The only honest reason to degrade is that this machine cannot HASH AT ALL.
  # vantry_seal_compute creates the key when it is missing, so on any machine
  # with sha256 a receipt sealed elsewhere — or not sealed — simply fails to
  # match and the gate blocks. That is correct: receipts are machine-local and
  # gitignored, so a receipt that did not come from this machine is one this
  # machine has no reason to trust.
  # A key that cannot be created or read is NOT "cannot hash": a key replaced by
  # a directory used to return 2 here, and the gate accepted every forged receipt.
  want="$(vantry_seal_compute "$(vantry_seal_payload "$r")")" || want=""
  if [ -z "$want" ]; then
    _vantry_can_hash && return 1      # we could seal; this receipt cannot be checked
    return 2                          # no hashing tool here: genuinely cannot tell
  fi
  have="$(vantry_receipt_field "$r" seal)"
  [ -n "$have" ] || return 1          # we CAN seal, and this one is not sealed
  [ "$have" = "$want" ] && return 0
  return 1
}

# ------------------------------------------------------------- JSON helpers
vantry_esc() {  # JSON-escape a scalar string
  # printf, never a heredoc: `<<EOF` always appends a newline, so every escaped
  # value in every receipt carried a trailing \n — "AC-1\n", "grep -q …\n".
  # Invisible in a diff, fatal to anything matching on the value.
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$1" | python3 -c 'import sys,json; sys.stdout.write(json.dumps(sys.stdin.read())[1:-1])'
  else
    printf '%s' "$1" | sed -e 's#\\#\\\\#g' -e 's#"#\\"#g' | tr '\n\t\r' '   '
  fi
}

vantry_json_get() {  # $1 = json text, $2 = dotted path
  if command -v jq >/dev/null 2>&1; then
    # NOT `// ""` — that swallows a legitimate `false` into the empty string.
    printf '%s' "$1" | jq -r --arg p "$2" '
      getpath($p | split(".")) as $v
      | if $v == null then empty else ($v | if type == "string" then . else tojson end) end' 2>/dev/null
  elif command -v python3 >/dev/null 2>&1; then
    printf '%s' "$1" | python3 -c '
import json,sys
try: d = json.load(sys.stdin)
except Exception: sys.exit(0)
for k in sys.argv[1].split("."):
    if isinstance(d, dict) and k in d: d = d[k]
    else: sys.exit(0)
if isinstance(d, bool): print("true" if d else "false")
elif d is None: pass
else: print(d if isinstance(d, str) else json.dumps(d))
' "$2" 2>/dev/null
  fi
}

vantry_receipt_field() {  # $1 = receipt path, $2 = dotted path
  [ -f "$1" ] || return 0
  vantry_json_get "$(cat "$1")" "$2"
}

# ----------------------------------------------------------------- audit log
vantry_log() {  # $1 = event, $2 = detail
  mkdir -p "$VANTRY_STATE" 2>/dev/null || return 0
  printf '{"at":"%s","event":"%s","branch":"%s","detail":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$(vantry_slug)" "$(vantry_esc "${2:-}")" \
    >> "$VANTRY_STATE/agent-log.jsonl" 2>/dev/null || true
}

vantry_is_project() { [ -f "$VANTRY_CFG" ]; }
