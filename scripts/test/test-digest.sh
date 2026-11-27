#!/usr/bin/env bash
# ============================================================================
#  test-digest.sh — proves the receipt fingerprint is unchanged by the batched
#  hashing in vantry-common.sh. The working-tree digest used to fork one hasher
#  (a Perl start-up on Windows) per changed file; it now hashes every file in
#  one call. Same bytes must give the same digest, or every receipt written
#  before the change would be judged stale — or, worse, a changed file current.
#
#  The reference below is the per-file algorithm the batch replaced, written
#  out again on purpose: comparing the library against itself proves nothing.
#  Usage: bash scripts/test/test-digest.sh [kit-path]
# ============================================================================
set -uo pipefail
KIT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
KIT="$(cd "$KIT" && pwd)"
WORK="$(mktemp -d)"
PASS=0; FAIL=0
ok()  { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; [ -n "${2:-}" ] && echo "$2" | sed 's/^/        /' | head -12; FAIL=$((FAIL + 1)); }

echo; echo "── tree digest (batched hashing) ──────────────────────────"

R="$WORK/repo"
mkdir -p "$R/scripts/lib" "$R/docs" "$R/dir with space" "$R/.vantry/receipts"
cp "$KIT/scripts/lib/vantry-common.sh" "$R/scripts/lib/"
cat > "$R/vantry.yml" <<'YML'
version: 1
merge:
  base: main
trivial_paths:
  - "docs/**"
  - "*.md"
YML
(
  cd "$R" && git init -q -b main . 2>/dev/null || { git init -q . && git checkout -q -b main; }
  git config user.email t@example.invalid; git config user.name t
  echo base > kept.txt; echo gone > gone.txt; echo x > tool.sh
  git add -A && git commit -qm base && git checkout -qb feature
) >/dev/null 2>&1

# The digest as it is computed now, in a fresh shell like every hook.
digest_now() { (cd "$R" && VANTRY_ROOT="$R" bash -c '. scripts/lib/vantry-common.sh; vantry_tree_digest'); }
# The same definition computed the slow, obvious way — one git call per file,
# the mode rule written out here rather than borrowed from the library: what
# `git add` would store, i.e. the blob id and the mode git would record.
digest_ref() {
  (cd "$R" && VANTRY_ROOT="$R" bash -c '. scripts/lib/vantry-common.sh
    vantry_changed_files | while IFS= read -r f; do
      if [ -f "$f" ]; then
        case "$(uname -s)" in
          MINGW*|MSYS*|CYGWIN*) m="$(git ls-files -s -- "$f" | cut -d" " -f1)"; m="${m:-100644}" ;;
          *) if [ -x "$f" ]; then m=100755; else m=100644; fi ;;
        esac
        printf "%s %s %s\n" "$(git hash-object -- "$f")" "$m" "$f"
      else printf "DELETED %s\n" "$f"; fi
    done | vantry_sha')
}
# The digest pre-push computes: the changeset as committed on <ref>.
digest_at() { (cd "$R" && VANTRY_ROOT="$R" VANTRY_REF="$1" bash -c '. scripts/lib/vantry-common.sh; vantry_tree_digest'); }
same() {  # same <label> — the two algorithms agree on the tree as it stands
  local a b; a="$(digest_now)"; b="$(digest_ref)"
  if [ -n "$a" ] && [ "$a" = "$b" ]; then ok "$1"; else bad "$1" "batched:  $a
per-file: $b"; fi
}

same "an empty changeset digests exactly as before"
D_EMPTY="$(digest_now)"

echo changed > "$R/kept.txt"
rm "$R/gone.txt"
echo "a space" > "$R/dir with space/file name.txt"
echo "café" > "$R/café.txt"
echo "*star" > "$R/*lead.txt"
printf 'no newline at end' > "$R/untracked.cfg"
: > "$R/empty.txt"
echo "evidence" > "$R/.vantry/receipts/x.json"
echo "trivial" > "$R/docs/notes.txt"
echo "trivial" > "$R/README.md"
same "modified, deleted, untracked, empty, spaced and non-ASCII paths: identical digest"
D1="$(digest_now)"
[ "$D1" != "$D_EMPTY" ] && ok "and the changeset moves the digest" || bad "a real changeset left the digest unchanged" ""

echo "more" >> "$R/docs/notes.txt"; echo "x" >> "$R/README.md"; echo "y" > "$R/.vantry/receipts/x.json"
[ "$(digest_now)" = "$D1" ] && ok "trivial paths and .vantry/ evidence never enter the digest" \
  || bad "a trivial or .vantry/ edit changed the digest" ""

# The default core.quotepath printed this name quoted; both digests then called
# it DELETED, and the file could be edited after verification unseen.
echo "encore" >> "$R/café.txt"
[ "$(digest_now)" != "$D1" ] && ok "an edit to a non-ASCII path moves the digest" \
  || bad "an edit to café.txt left the digest unchanged" ""

echo y >> "$R/tool.sh"; D3="$(digest_now)"
chmod +x "$R/tool.sh" 2>/dev/null
if [ ! -x "$R/tool.sh" ]; then
  echo "  ↷ chmod +x is not observable on this filesystem (Git Bash) — the mode case runs on POSIX CI, not counted here"
else
  DX="$(digest_now)"
  [ "$DX" != "$D3" ] && ok "a mode change alone moves the digest" || bad "chmod +x left the digest unchanged" ""
  same "and the mode is recorded exactly as before"
  D3="$DX"
fi

echo "edit" >> "$R/dir with space/file name.txt"
[ "$(digest_now)" != "$D3" ] && ok "one byte in a spaced path moves the digest" || bad "an edit to a spaced path was missed" ""
same "after that edit the two algorithms still agree"

# Many files in one call: the batch must keep every hash on its own path.
for i in $(seq 1 30); do echo "f$i" > "$R/bulk-$i.txt"; done
same "30 more files: no hash shifted onto another path"

echo; echo "── the receipt digest equals the digest pre-push computes ──"
# A receipt is written from the working tree; pre-push judges the commit. If the
# two disagree on identical code, a verified branch can never be pushed — which
# is what happened on Windows (core.autocrlf=true, core.filemode=false).
printf 'one\ntwo\n' > "$R/eol.txt"
( cd "$R" && git add -A && git commit -qm "feature work" ) >/dev/null 2>&1
DW="$(digest_now)"; DR="$(digest_at feature)"
[ -n "$DW" ] && [ "$DW" = "$DR" ] && ok "committed changeset: receipt digest = pre-push digest" \
  || bad "the receipt and pre-push disagree on identical committed code" "worktree: $DW
ref:      $DR"

git -C "$R" config core.autocrlf true
printf 'one\r\ntwo\r\n' > "$R/eol.txt"            # what a checkout writes under autocrlf
[ "$(digest_now)" = "$DR" ] && ok "a CRLF checkout of the same commit digests like the LF blob pre-push reads" \
  || bad "CRLF on disk moved the digest: the verified branch would be refused at push" "worktree: $(digest_now)
ref:      $DR"
same "under autocrlf the two algorithms still agree"

git -C "$R" config core.filemode false
printf '#!/bin/sh\necho hi\n' > "$R/new-tool.sh"; chmod +x "$R/new-tool.sh" 2>/dev/null
( cd "$R" && git add new-tool.sh && git commit -qm "a script" ) >/dev/null 2>&1
DR2="$(digest_at feature)"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    [ "$(digest_now)" = "$DR2" ] && ok "Windows: a new #! file digests with the mode git recorded" \
      || bad "the worktree mode disagrees with the mode git recorded" "recorded: $(git -C "$R" ls-files -s new-tool.sh)
worktree: $(digest_now)
ref:      $DR2" ;;
  *)
    # POSIX sees the executable bit, so core.filemode=false — settable through
    # GIT_CONFIG_* without touching a file — must not make the receipt adopt
    # the index's claim: 755 on disk recorded as 644 is a hook clones ignore.
    [ "$(digest_now)" != "$DR2" ] && ok "POSIX: core.filemode=false cannot pass off a 755 file recorded 644" \
      || bad "a 755 file recorded 644 digested as verified" "recorded: $(git -C "$R" ls-files -s new-tool.sh)" ;;
esac
echo "edit" >> "$R/eol.txt"
[ "$(digest_now)" != "$DR2" ] && ok "and a real content change still moves the digest" \
  || bad "a content change was missed under autocrlf" ""
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) spoof=Linux ;; *) spoof=MINGW64_NT-10.0 ;; esac
trusted() { (cd "$R" && VANTRY_ROOT="$R" bash -c '. scripts/lib/vantry-common.sh; vantry_filemode_trusted; echo $?'); }
real="$(trusted)"; faked="$(_VANTRY_UNAME="$spoof" trusted)"
[ "$real" = "$faked" ] && ok "_VANTRY_UNAME=$spoof inherited from the environment does not move the mode source" \
  || bad "an inherited _VANTRY_UNAME decided where modes come from" "real: $real  spoofed: $faked"

echo; echo "── a filter set outside the tree cannot launder the bytes ──"
chmod -x "$R/new-tool.sh" 2>/dev/null
( cd "$R" && git add -A && git commit -qm sync ) >/dev/null 2>&1
DS="$(digest_now)"; DRS="$(digest_at feature)"
[ -n "$DS" ] && [ "$DS" = "$DRS" ] && ok "control: a synced tree digests like its commit" \
  || bad "control: the synced tree and its commit disagree" "worktree: $DS
ref:      $DRS"
mkdir -p "$R/.git/info"
# check-attr prints `unset` / `unspecified` for a driver NAMED that, too. Each
# driver gets its own file, removed afterwards, so one case cannot pass on the
# back of the one before it.
for drv in evil unset unspecified; do
  printf 'echo good\n' > "$R/f-$drv.sh"
  printf 'f-%s.sh filter=%s\n' "$drv" "$drv" >> "$R/.git/info/attributes"
  git -C "$R" config "filter.$drv.clean" 'sed s/good/EVIL/'
  DW="$(digest_now)"
  ( cd "$R" && git add "f-$drv.sh" && git commit -qm "filtered $drv" ) >/dev/null 2>&1
  [ "$DW" != "$(digest_at feature)" ] \
    && ok "a clean filter named \"$drv\" in .git/info/attributes cannot make pre-push accept untested bytes" \
    || bad "driver \"$drv\": the receipt digest matched a commit holding bytes nobody tested" "$(git -C "$R" show "feature:f-$drv.sh")"
  ( cd "$R" && git rm -q "f-$drv.sh" && git commit -qm "drop $drv" ) >/dev/null 2>&1
done

echo; echo "── a name that is not UTF-8 stays in the changeset ──"
# Built with plumbing, so no filesystem has to store the name (NTFS and APFS
# cannot): the case runs on every OS instead of being skipped.
(
  cd "$R" || exit 1
  b="$(printf 'x\n' | git hash-object -w --stdin)"
  t="$( { git ls-tree -z feature; printf '100644 blob %s\t\377\0' "$b"; } | git mktree -z )"
  git update-ref refs/heads/nonutf8 "$(git commit-tree "$t" -p feature -m 'non-utf8 name')"
) >/dev/null 2>&1
u8() { (cd "$R" && LC_ALL=C.UTF-8 LANG=C.UTF-8 VANTRY_ROOT="$R" VANTRY_REF=nonutf8 bash -c ". scripts/lib/vantry-common.sh; $1" 2>/dev/null); }
[ "$(u8 vantry_changed_files | LC_ALL=C grep -c "$(printf '\377')")" = "1" ] \
  && ok "a non-UTF-8 name stays in the changeset under a UTF-8 locale" \
  || bad "a non-UTF-8 name dropped out of the changeset: its edits are never fingerprinted" ""
lines="$(u8 vantry_changed_files | wc -l | tr -d ' ')"
[ "$(u8 vantry_changed_count)" = "$lines" ] \
  && ok "and the count the gates test for zero includes it ($lines)" \
  || bad "the gates' count dropped the non-UTF-8 name" "count: $(u8 vantry_changed_count)  lines: $lines"
git -C "$R" update-ref -d refs/heads/nonutf8

echo; echo "── the seal key fails closed ──"
S="$WORK/seal"; mkdir -p "$S/scripts/lib" "$S/.vantry/state/seal.key"
cp "$KIT/scripts/lib/vantry-common.sh" "$S/scripts/lib/"
printf '{"verdict": "pass", "seal": "%064d"}\n' 0 > "$S/r.json"
seal() { (cd "$S" && VANTRY_ROOT="$S" bash -c ". scripts/lib/vantry-common.sh; $1" 2>/dev/null); }
rc="$(seal 'vantry_seal_ok r.json; echo $?' | tail -1)"
[ "$rc" = "1" ] && ok "an unusable seal key refuses the receipt (it used to mean \"cannot tell\")" \
  || bad "a key replaced by a directory left the seal check at rc=$rc — 2 is accepted by the gate" ""
rm -rf "$S/.vantry/state"; mkdir -p "$S/.vantry/state"
printf 'created-before-the-fix' > "$S/.vantry/state/seal.key"; chmod 644 "$S/.vantry/state/seal.key"
seal 'vantry_seal_key >/dev/null'
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    ACL="$(MSYS_NO_PATHCONV=1 icacls "$(cygpath -w "$S/.vantry/state/seal.key")" 2>&1)"
    if [ "$(printf '%s\n' "$ACL" | grep -c ':(')" = "1" ] && ! printf '%s\n' "$ACL" | grep -q '(I)'; then
      ok "a key created before the ACL fix is restricted to this account on first use"
    else bad "an existing seal key kept an ACL other accounts can use" "$ACL"; fi ;;
  *)
    case "$(ls -l "$S/.vantry/state/seal.key" | cut -c1-10)" in
      -rw-------*) ok "a key created before the fix is made 600 on first use" ;;
      *) bad "an existing seal key stayed readable by others" "$(ls -l "$S/.vantry/state/seal.key")" ;;
    esac ;;
esac
# A restriction that fails must say so: the old one returned 0 without icacls
# or %USERNAME%, and the marker then recorded a key nothing had restricted.
fail_restrict='_vantry_owner_only() { return 1; }; vantry_seal_key >/dev/null; echo $?'
rm -rf "$S/.vantry/state"; mkdir -p "$S/.vantry/state"
rc="$(seal "$fail_restrict" | tail -1)"
[ "$rc" = "1" ] && [ ! -e "$S/.vantry/state/seal.key" ] && [ ! -e "$S/.vantry/state/seal.key.owner-only" ] \
  && ok "a key that cannot be restricted is never created" \
  || bad "a key was created or marked restricted although restricting failed (rc=$rc)" "$(ls -la "$S/.vantry/state" 2>&1)"
printf 'created-before-the-fix' > "$S/.vantry/state/seal.key"
rc="$(seal "$fail_restrict" | tail -1)"
[ "$rc" = "1" ] && [ ! -e "$S/.vantry/state/seal.key.owner-only" ] \
  && ok "an old key that cannot be restricted is refused, and never marked restricted" \
  || bad "an old key was used or marked restricted although restricting failed (rc=$rc)" ""
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    rm -rf "$S/.vantry/state"; mkdir -p "$S/.vantry/state"
    (cd "$S" && env -u USERNAME -u USERDOMAIN VANTRY_ROOT="$S" bash -c '. scripts/lib/vantry-common.sh; vantry_seal_key >/dev/null' 2>/dev/null)
    ACL="$(MSYS_NO_PATHCONV=1 icacls "$(cygpath -w "$S/.vantry/state/seal.key")" 2>&1)"
    if [ "$(printf '%s\n' "$ACL" | grep -c ':(')" = "1" ] && ! printf '%s\n' "$ACL" | grep -q '(I)' \
       && [ -e "$S/.vantry/state/seal.key.owner-only" ]; then
      ok "with %USERNAME% unset, a new key is still restricted to this account"
    else bad "with %USERNAME% unset the key kept an ACL other accounts can use" "$ACL"; fi ;;
esac

# A small repository per case, so no case passes on the state another left.
mkrepo() {  # mkrepo <dir> [extra vantry.yml lines] — main holds what <dir> holds, then branch feature
  mkdir -p "$1/scripts/lib"; cp "$KIT/scripts/lib/vantry-common.sh" "$1/scripts/lib/"
  printf 'version: 1\nmerge:\n  base: main\n%s' "${2:-}" > "$1/vantry.yml"
  ( cd "$1" && { git init -q -b main . 2>/dev/null || { git init -q . && git checkout -q -b main; }; }
    git config user.email t@example.invalid; git config user.name t
    git add -A && git commit -qm base && git checkout -qb feature ) >/dev/null 2>&1
}
dn()  { (cd "$1" && VANTRY_ROOT="$1" bash -c '. scripts/lib/vantry-common.sh; vantry_tree_digest' 2>/dev/null); }
dat() { (cd "$1" && VANTRY_ROOT="$1" VANTRY_REF="$2" bash -c '. scripts/lib/vantry-common.sh; vantry_tree_digest' 2>/dev/null); }
commit() { (cd "$1" && git add -A && git commit -qm "$2") >/dev/null 2>&1; }

echo; echo "── a rename cannot hide a deletion (#11) ──"
RN="$WORK/rename"; mkdir -p "$RN"; seq 1 200 | sed 's/^/line /' > "$RN/a.txt"; mkrepo "$RN"
sed 's/^line 7$/line seven/' "$RN/a.txt" > "$RN/b.txt"; git -C "$RN" add b.txt 2>/dev/null
D_KEEP="$(dn "$RN")"
git -C "$RN" rm -q a.txt
D_GONE="$(dn "$RN")"
[ -n "$D_GONE" ] && [ "$D_GONE" != "$D_KEEP" ] && ok "deleting a file next to its near-copy moves the digest" \
  || bad "a deletion git saw as a rename left the digest unchanged" "$(git -C "$RN" diff --name-status main)"
commit "$RN" "rename"
[ "$(dn "$RN")" = "$(dat "$RN" feature)" ] && ok "and the receipt digest still equals the pre-push digest" \
  || bad "the receipt and pre-push disagree on a committed rename" "worktree: $(dn "$RN")
ref:      $(dat "$RN" feature)"

echo; echo "── a submodule is fingerprinted by its commit (#13) ──"
SM="$WORK/sub-src"; mkdir -p "$SM"
( cd "$SM" && git init -q . && git config user.email t@example.invalid && git config user.name t \
  && for n in 1 2 3; do echo "$n" > s.txt; git add s.txt; git commit -qm "s$n"; done ) >/dev/null 2>&1
C1="$(git -C "$SM" rev-parse HEAD~2)"; C2="$(git -C "$SM" rev-parse HEAD~1)"
SB="$WORK/super"; mkdir -p "$SB"; echo base > "$SB/keep.txt"; mkrepo "$SB"
( cd "$SB" && git -c protocol.file.allow=always submodule add -q "$SM" sub \
  && git -C sub checkout -q "$C1" && git add sub .gitmodules && git commit -qm "sub at C1" ) >/dev/null 2>&1
if [ "$(git -C "$SB" ls-files -s sub | cut -d' ' -f1)" = "160000" ]; then
  D_C1="$(dn "$SB")"
  [ -n "$D_C1" ] && [ "$D_C1" = "$(dat "$SB" feature)" ] && ok "a committed submodule: receipt digest = pre-push digest" \
    || bad "the receipt and pre-push disagree on a committed submodule" "worktree: $D_C1
ref:      $(dat "$SB" feature)"
  git -C "$SB/sub" checkout -q "$C2"
  [ "$(dn "$SB")" != "$D_C1" ] && ok "moving the submodule to another commit moves the digest" \
    || bad "a submodule bump left the digest unchanged" ""
  commit "$SB" "sub at C2"
  [ "$(dat "$SB" feature)" != "$D_C1" ] && [ "$(dn "$SB")" = "$(dat "$SB" feature)" ] \
    && ok "pre-push sees the bump too, and agrees with the receipt" \
    || bad "pre-push missed the submodule bump or disagrees" "worktree: $(dn "$SB")
ref:      $(dat "$SB" feature)"
  echo dirty >> "$SB/sub/s.txt"
  [ "$(dn "$SB")" != "$(dn "$SB")" ] && ok "a submodule with uncommitted changes makes no receipt current" \
    || bad "uncommitted submodule changes digest like the commit" ""
else
  bad "could not build the submodule fixture" "$(git -C "$SB" ls-files -s 2>&1 | head -3)"
fi

echo; echo "── a submodule set to ignore = all is still fingerprinted (#13) ──"
# `submodule.<name>.ignore = all` in .gitmodules (common for vendored code, and
# .gitmodules is not a sensitive file) or diff.ignoreSubmodules in .git/config
# dropped the gitlink from every name list: a bump left the receipt current,
# and CI never listed it as a sensitive change.
C3="$(git -C "$SM" rev-parse HEAD)"
SI="$WORK/super-ignore"; mkdir -p "$SI"; echo base > "$SI/keep.txt"
mkrepo "$SI" "sensitive_paths:
  - \"vendor/**\"
"
( cd "$SI" && git -c protocol.file.allow=always submodule add -q "$SM" vendor/sub \
  && git -C vendor/sub checkout -q "$C1" && git config -f .gitmodules submodule.vendor/sub.ignore all \
  && git add .gitmodules && git update-index --cacheinfo "160000,$C1,vendor/sub" \
  && git commit -qm "sub at C1, ignore = all" ) >/dev/null 2>&1
if [ "$(git -C "$SI" ls-files -s vendor/sub | cut -d' ' -f1)" = "160000" ] \
   && [ "$(git -C "$SI" config -f .gitmodules submodule.vendor/sub.ignore)" = "all" ]; then
  I1="$(dn "$SI")"
  [ -n "$I1" ] && [ "$I1" = "$(dat "$SI" feature)" ] && ok "ignore = all: receipt digest = pre-push digest" \
    || bad "ignore = all: the receipt and pre-push disagree" "worktree: $I1
ref:      $(dat "$SI" feature)"
  git -C "$SI/vendor/sub" checkout -q "$C2"
  [ "$(dn "$SI")" != "$I1" ] && ok "ignore = all: a bump still moves the digest" \
    || bad "ignore = all hid a submodule bump from the digest" ""
  ( cd "$SI" && git update-index --cacheinfo "160000,$C2,vendor/sub" && git commit -qm "sub at C2" ) >/dev/null 2>&1
  [ "$(dat "$SI" feature)" != "$I1" ] && [ "$(dn "$SI")" = "$(dat "$SI" feature)" ] \
    && ok "ignore = all: pre-push sees the committed bump, and agrees with the receipt" \
    || bad "ignore = all hid the committed bump from pre-push" "worktree: $(dn "$SI")
ref:      $(dat "$SI" feature)"
  (cd "$SI" && VANTRY_ROOT="$SI" bash -c '. scripts/lib/vantry-common.sh; vantry_sensitive_hits main...HEAD') \
    | grep -qxF vendor/sub && ok "ignore = all: CI lists the bumped submodule as a sensitive change" \
    || bad "ignore = all hid a sensitive submodule from CI" ""
  git -C "$SI" config diff.ignoreSubmodules all; I2="$(dn "$SI")"
  git -C "$SI/vendor/sub" checkout -q "$C3"
  [ "$(dn "$SI")" != "$I2" ] && ok "diff.ignoreSubmodules = all in .git/config hides nothing either" \
    || bad "diff.ignoreSubmodules = all hid a submodule bump" ""
else
  bad "could not build the ignore = all submodule fixture" "$(git -C "$SI" ls-files -s 2>&1 | head -3)"
fi

echo; echo "── a file hidden by an index flag cannot change unseen (#13) ──"
# skip-worktree / assume-unchanged make git stop reading the file on disk: it
# leaves `git diff`, so the changeset never named it and an edit made after
# verification moved no digest, while what ran was not what git commits.
FL="$WORK/flags"; mkdir -p "$FL"; echo ok > "$FL/x.sh"; echo a > "$FL/y.txt"; echo n > "$FL/n.md"
mkrepo "$FL" 'trivial_paths:
  - "*.md"
'
echo b > "$FL/y.txt"   # a non-empty changeset: only then is a receipt asked for
F1="$(dn "$FL")"
# The hooks source the library under `set -u`: an unset variable there aborts
# the digest. Same digest, nothing on stderr about it.
dnu() { (cd "$1" && VANTRY_ROOT="$1" bash -uc '. scripts/lib/vantry-common.sh; vantry_tree_digest' 2>"$WORK/u.err"); }
U1="$(dnu "$FL")"
[ "$U1" = "$F1" ] && ! grep -q 'unbound' "$WORK/u.err" \
  && ok "under set -u, as the hooks run it, the digest is the same and complete" \
  || bad "the digest breaks under set -u" "$(head -3 "$WORK/u.err")"
git -C "$FL" update-index --skip-worktree x.sh n.md
[ "$(dn "$FL")" = "$F1" ] && ok "a flag on an untouched file changes nothing (the digest repeats)" \
  || bad "skip-worktree on an untouched file moved the digest" ""
echo TAMPERED > "$FL/x.sh"; echo TAMPERED > "$FL/n.md"
if git -C "$FL" diff --name-only main 2>/dev/null | grep -qx x.sh; then
  bad "fixture: git still lists the skip-worktree file, so the flag is not what is tested" ""
else
  S1="$(dn "$FL")"; S2="$(dnu "$FL")"
  grep -q 'unbound' "$WORK/u.err" && bad "the flag check breaks under set -u" "$(head -3 "$WORK/u.err")"
  [ "$S1" != "$F1" ] && [ "$S1" != "$S2" ] && [ "$S2" != "$F1" ] \
    && ok "skip-worktree: an edit git no longer sees leaves no receipt current" \
    || bad "an edit behind skip-worktree left the digest unchanged" "before: $F1  after: $S1 / $S2"
  (cd "$FL" && VANTRY_ROOT="$FL" bash -c '. scripts/lib/vantry-common.sh; vantry_tree_digest' 2>&1 >/dev/null) \
    | grep -q 'x.sh is marked skip-worktree/assume-unchanged' \
    && ok "and it says which file, and how to clear the flag" || bad "the flagged file was refused in silence" ""
  echo n > "$FL/n.md"; git -C "$FL" update-index --no-skip-worktree x.sh; echo ok > "$FL/x.sh"
  [ "$(dn "$FL")" = "$F1" ] && ok "flag cleared and file restored: the digest is the one verified" \
    || bad "clearing the flag did not bring the digest back" ""
  git -C "$FL" update-index --assume-unchanged x.sh; echo TAMPERED > "$FL/x.sh"
  A1="$(dn "$FL")"; A2="$(dn "$FL")"
  [ "$A1" != "$F1" ] && [ "$A1" != "$A2" ] \
    && ok "assume-unchanged: the same edit leaves no receipt current either" \
    || bad "an edit behind assume-unchanged left the digest unchanged" "before: $F1  after: $A1 / $A2"
  git -C "$FL" update-index --no-assume-unchanged x.sh; echo ok > "$FL/x.sh"
  echo TAMPERED > "$FL/n.md"
  [ "$(dn "$FL")" = "$F1" ] && ok "a flagged trivial path is not asked about (*.md)" \
    || bad "a flagged trivial path blocked the receipt" ""
fi

echo; echo "── a symlink is fingerprinted by its target (#14) ──"
LN="$WORK/link"; mkdir -p "$LN"; echo base > "$LN/keep.txt"; mkrepo "$LN"
echo t > "$LN/t.txt"; ln -s t.txt "$LN/l" 2>/dev/null; git -C "$LN" add -A >/dev/null 2>&1
if [ -L "$LN/l" ] && [ "$(git -C "$LN" ls-files -s l | cut -d' ' -f1)" = "120000" ]; then
  commit "$LN" "link"
  [ "$(dn "$LN")" = "$(dat "$LN" feature)" ] && ok "a committed symlink: receipt digest = pre-push digest" \
    || bad "the receipt and pre-push disagree on a symlink" "worktree: $(dn "$LN")
ref:      $(dat "$LN" feature)"
  rm "$LN/l"; ln -s nowhere-a "$LN/l"; D_A="$(dn "$LN")"
  rm "$LN/l"; ln -s nowhere-b "$LN/l"; D_B="$(dn "$LN")"
  [ "$D_A" != "$D_B" ] && ok "retargeting a dangling symlink moves the digest" \
    || bad "two dangling targets digested alike (both read as DELETED)" ""
else
  echo "  ↷ this filesystem cannot hold a symlink git records as one — the symlink case runs on POSIX CI"
fi
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    # core.symlinks=false: the link is checked out as a file holding its target.
    LW="$WORK/linkfile"; mkdir -p "$LW"; echo base > "$LW/keep.txt"; mkrepo "$LW"
    ( cd "$LW" && b="$(printf 'keep.txt' | git hash-object -w --stdin)" \
      && git update-index --add --cacheinfo "120000,$b,lw" && git commit -qm "link as file" \
      && printf 'keep.txt' > lw ) >/dev/null 2>&1
    [ "$(dn "$LW")" = "$(dat "$LW" feature)" ] && ok "Windows: a symlink checked out as a file digests like the link" \
      || bad "a symlink checked out as a file disagrees with pre-push" "worktree: $(dn "$LW")
ref:      $(dat "$LW" feature)" ;;
esac

echo; echo "── the CI sensitive-path list sees every name (#12) ──"
SH="$WORK/sens"; mkdir -p "$SH/.githooks"; seq 1 100 | sed 's/^/hook line /' > "$SH/.githooks/pre-push"
mkrepo "$SH" "sensitive_paths:
  - \".githooks/**\"
  - \".github/workflows/**\"
"
mkdir -p "$SH/tools" "$SH/.github/workflows"
git -C "$SH" mv .githooks/pre-push tools/pre-push
echo x > "$SH/.github/workflows/é.yml"; echo x > "$SH/.github/workflows/a b.yml"
commit "$SH" "move a hook, add two workflows"
hits() { (cd "$SH" && VANTRY_ROOT="$SH" bash -c '. scripts/lib/vantry-common.sh; vantry_sensitive_hits "$@"' _ "$@"); }
H="$(hits main...HEAD)"
for want in .githooks/pre-push ".github/workflows/é.yml" ".github/workflows/a b.yml"; do
  printf '%s\n' "$H" | grep -qxF -- "$want" && ok "detected: $want" \
    || bad "the sensitive-path list missed $want" "$H"
done
printf '%s\n' "$H" | grep -qxF tools/pre-push && bad "a non-sensitive destination was listed" "$H" \
  || ok "the harmless destination of the move is not listed"
hits no-such-ref...HEAD >/dev/null 2>&1; rc=$?
[ "$rc" = "2" ] && ok "a diff git cannot compute is an error, never an empty list" \
  || bad "an impossible diff returned rc=$rc" ""
# A PR used to be judged by its OWN vantry.yml: deleting an entry from
# sensitive_paths exempted the very PR that deleted it.
git -C "$SH" show main:vantry.yml > "$WORK/base-vantry.yml"
# -i.bak, not a bare -i: BSD sed (macOS) reads the next word as the suffix.
sed -i.bak '/githooks/d' "$SH/vantry.yml" && rm -f "$SH/vantry.yml.bak"
mkdir -p "$SH/.githooks"; echo y > "$SH/.githooks/pre-commit"
commit "$SH" "drop .githooks from the list, then edit a hook"
hits main...HEAD | grep -qxF .githooks/pre-commit \
  && bad "control: the PR's own list was expected to miss the hook" "" \
  || ok "control: judged by its own vantry.yml alone, the PR exempts itself"
hits --also "$WORK/base-vantry.yml" main...HEAD | grep -qxF .githooks/pre-commit \
  && ok "judged by the base branch's list too, the hook edit still needs a review" \
  || bad "deleting a sensitive_paths entry exempted the PR that deleted it" "$(hits --also "$WORK/base-vantry.yml" main...HEAD)"
# quotepath=off or not, git still quotes a name holding `"`, `\` or a control
# character, and the quoted text matched no pattern: a PR adding only such a
# workflow skipped the review. Written straight into the index, so the case
# runs on Windows too (core.protectNTFS refuses these names there, by default).
QB="$(echo x | git -C "$SH" hash-object -w --stdin)"
for n in '.github/workflows/x"y.yml' '.github/workflows/a\b.yml' "$(printf '.github/workflows/\tab.yml')"; do
  git -C "$SH" -c core.protectNTFS=false update-index --add --cacheinfo "100644,$QB,$n" >/dev/null 2>&1
done
git -C "$SH" -c core.protectNTFS=false commit -qm "three names git must quote" >/dev/null 2>&1
H="$(hits main...HEAD)"; nq="$(printf '%s\n' "$H" | grep -c '^"')"
[ "$nq" = "3" ] && ok "a name git quotes is listed as sensitive, never dropped (3 of 3)" \
  || bad "a quoted name escaped the sensitive-path list ($nq of 3 listed)" "$H"
WF="$KIT/.github/workflows/verify.yml"
if grep -q 'vantry_sensitive_hits' "$WF" && ! grep -vE '^[[:space:]]*#' "$WF" | grep -qE 'for f in \$(DIFF|AFTER)'; then
  ok "verify.yml uses the shared helper, not a whitespace-split loop"
else bad "verify.yml still splits the name list itself" "$(grep -nE 'for f in|vantry_sensitive_hits' "$WF")"; fi
[ "$(grep -c 'vantry_sensitive_hits --also "\$BASECFG"' "$WF")" = "1" ] \
  && [ "$(grep -c 'vantry_review_drift --also "\$BASECFG"' "$WF")" = "1" ] && grep -q 'git show "\$BASE:vantry.yml"' "$WF" \
  && ok "verify.yml judges both the diff and the late changes by the base list too" \
  || bad "verify.yml does not read the base branch's sensitive_paths" "$(grep -n 'sensitive_hits\|review_drift\|BASECFG' "$WF")"

echo; echo "── merging the base after a review does not stale it; a branch edit does ──"
# CI judged staleness with the two-dot diff <reviewed> <head>, which also lists
# every sensitive file the BASE changed. Merging the base after the review — the
# PR gate requires it, GitHub's "Update branch" does it — turned a correct
# verdict red and forced a full re-review of code the branch never touched.
RD="$WORK/drift"; mkdir -p "$RD/auth"
seq 1 20 > "$RD/auth/mine.sh"; seq 1 20 > "$RD/auth/theirs.sh"; seq 1 20 > "$RD/auth/both.sh"
mkrepo "$RD" "sensitive_paths:
  - \"auth/**\"
"
drift() { (cd "$RD" && VANTRY_ROOT="$RD" bash -c '. scripts/lib/vantry-common.sh; vantry_review_drift "$@"' _ "$@"); }
edit_line() { sed "s/^$2\$/$3/" "$RD/$1" > "$RD/$1.new" && mv "$RD/$1.new" "$RD/$1"; }
edit_line auth/mine.sh 5 five; edit_line auth/both.sh 20 twenty; commit "$RD" "the branch's sensitive change"
RV="$(git -C "$RD" rev-parse HEAD)"                       # the review is made here
git -C "$RD" commit -q --allow-empty -m "the verdict commit" >/dev/null 2>&1
D="$(drift main "$RV" HEAD)"
[ -z "$D" ] && ok "the verdict commit alone leaves the review current" || bad "a commit changing nothing staled the review" "$D"
git -C "$RD" checkout -q main; edit_line auth/theirs.sh 3 three; commit "$RD" "another PR, reviewed in its own right"
git -C "$RD" checkout -q feature; git -C "$RD" merge -q --no-edit main >/dev/null 2>&1
D="$(drift main "$RV" HEAD)"
[ -z "$D" ] && ok "merging the base in after the review keeps the verdict current" \
  || bad "the base's own sensitive change staled this branch's review" "$D"
(cd "$RD" && VANTRY_ROOT="$RD" bash -c '. scripts/lib/vantry-common.sh; vantry_sensitive_hits "$1" HEAD' _ "$RV") | grep -qxF auth/theirs.sh \
  && ok "control: the old two-dot diff did list the base's file" || bad "control: the two-dot diff was expected to list auth/theirs.sh" ""
git -C "$RD" checkout -q main; edit_line auth/both.sh 1 one; commit "$RD" "the base edits a file the branch edits too"
git -C "$RD" checkout -q feature; git -C "$RD" merge -q --no-edit main >/dev/null 2>&1
D="$(drift main "$RV" HEAD)"
printf '%s\n' "$D" | grep -qxF auth/both.sh && ok "a file both sides changed is re-reviewed: that combination is new" \
  || bad "a file changed on both sides was excused" "$D"
printf '%s\n' "$D" | grep -qxF auth/theirs.sh && bad "a base-only file was listed" "$D" || ok "...and only that file"
git -C "$RD" checkout -q main; edit_line auth/theirs.sh 7 seven; commit "$RD" "the base moves again"
git -C "$RD" checkout -q feature; git -C "$RD" merge -q --no-commit --no-ff main >/dev/null 2>&1
edit_line auth/theirs.sh 9 nine; git -C "$RD" add -A >/dev/null 2>&1; git -C "$RD" commit -qm "a merge that slips in an edit" >/dev/null 2>&1
drift main "$RV" HEAD | grep -qxF auth/theirs.sh && ok "an edit slipped into a merge commit stales the review" \
  || bad "an edit hidden in a merge resolution went unnoticed" "$(drift main "$RV" HEAD)"
edit_line auth/mine.sh 15 fifteen; commit "$RD" "a change after the review"
drift main "$RV" HEAD | grep -qxF auth/mine.sh && ok "editing a reviewed sensitive file after the review stales it" \
  || bad "a sensitive edit after the review went unnoticed" "$(drift main "$RV" HEAD)"
drift main no-such-ref HEAD >/dev/null 2>&1; rc=$?
[ "$rc" = "2" ] && ok "a comparison git cannot make is an error, never an empty list" || bad "an impossible comparison returned rc=$rc" ""

echo; echo "── a merge that throws away the base's sensitive change stales the review ──"
# Found by the security review of the function above. Its candidates came only
# from <reviewed> → <head>: resolve a merge so a sensitive file the base fixed
# goes back to its old bytes (or a both-sides change to "ours") and that file
# equals the reviewed commit again. Nobody looked at it, the verdict stayed
# current, and merging the PR reverted a fix no one re-reviewed.
lost() {  # lost <name> <base edits> <merge resolution or ""> → the drift list
  local R="$WORK/lost-$1"
  mkdir -p "$R/auth"; for f in a b d e; do seq 1 20 > "$R/auth/$f"; done
  mkrepo "$R" "sensitive_paths:
  - \"auth/**\"
"
  ( cd "$R" || exit 2
    sub() { sed "s/^$2\$/$3/" "$1" > "$1.t" && mv "$1.t" "$1"; }
    sub auth/a 1 branch-a; sub auth/d 1 branch-d; git commit -qam "the branch's sensitive change"
    RV="$(git rev-parse HEAD)"
    git checkout -q main; eval "$2"; git commit -qam "the base fixes something"
    git checkout -q feature; git merge -q --no-commit --no-ff main
    if [ -n "$3" ]; then eval "$3"; git add -A; fi
    git commit -qm "merge the base"
    VANTRY_ROOT="$R" bash -c '. scripts/lib/vantry-common.sh; vantry_review_drift main "$1" HEAD' _ "$RV"
  ) 2>/dev/null
}
D="$(lost clean 'sub auth/b 20 base-b' '')"
[ -z "$D" ] && ok "control: a clean merge of a base-only change is still excused" || bad "a clean base merge staled the review" "$D"
D="$(lost dropped 'sub auth/e 10 FIX' 'git show "$RV:auth/e" > auth/e')"
printf '%s\n' "$D" | grep -qxF auth/e && ok "a merge that reverts the base's fix to a file the branch never touched is listed" \
  || bad "a base fix thrown away by the merge was excused" "$D"
D="$(lost ours 'sub auth/d 20 FIX' 'git show "$RV:auth/d" > auth/d')"
printf '%s\n' "$D" | grep -qxF auth/d && ok "a both-sides change resolved to the branch's side is listed" \
  || bad "a both-sides change resolved to ours was excused" "$D"
D="$(lost mixed 'sub auth/b 20 base-b; sub auth/e 10 FIX' 'git show "$RV:auth/e" > auth/e')"
{ printf '%s\n' "$D" | grep -qxF auth/e && ! printf '%s\n' "$D" | grep -qxF auth/b; } \
  && ok "keeping one base fix and dropping another lists only the dropped one" \
  || bad "expected exactly auth/e in the drift list" "$D"
D="$(lost both 'sub auth/d 20 FIX' '')"
printf '%s\n' "$D" | grep -qxF auth/d && ok "a both-sides change merged cleanly is still listed" \
  || bad "a clean both-sides merge was excused" "$D"
# GitHub pastes an expression into a run: script's TEXT before bash parses it,
# comments included. The PR author names the head branch, so a branch called
# a")";exit${IFS}0;# ended the security step green with no verdict. Event
# values reach a script through env: only; no run: (or github-script script:)
# value may hold an expression. This reads lines, not YAML: every line deeper
# than a run:/script: key is part of its value, whatever follows the key (a
# block, a folded or plain scalar, an anchor, a tag, the next line), and a
# flow-mapping step is caught by its `, run:` / `{ run:`.
run_exprs() {
  awk -v E='${{' 'function ind(s) { match(s, /^ */); return RLENGTH }
       FNR == 1 { inrun = 0 }
       inrun { if ($0 ~ /^[[:space:]]*$/) next
               if (ind($0) > rk) { if (index($0, E)) print FILENAME ":" FNR ": " $0; next }
               inrun = 0 }
       match($0, /^[[:space:]]*(-[[:space:]]+)?(run|script):/) {
         klen = (substr($0, 1, RLENGTH) ~ /script:$/) ? 7 : 4
         inrun = 1; rk = RLENGTH - klen
         if (index($0, E)) print FILENAME ":" FNR ": " $0
         next }
       $0 ~ /[{,][[:space:]]*(run|script):/ && index($0, E) { print FILENAME ":" FNR ": " $0 }' "$@"
}
mkdir -p "$WORK/wf"
cat > "$WORK/wf/bad.yml" <<'YML'
jobs:
  a:
    steps:
      - name: block scalar
        env:
          SAFE: ${{ github.head_ref }}
        run: |
          echo "$SAFE"
          # ${{ github.head_ref }} even in a comment
          echo ok
      - run: echo "${{ github.event.pull_request.title }}"
      - run: echo fine
      - name: value on the next line
        run:
          echo "${{ github.head_ref }}"
      - run: &script |
          echo "${{ github.head_ref }}"
      - run: !!str |
          echo "${{ github.head_ref }}"
      - { name: flow, run: 'echo ${{ github.head_ref }}' }
      -   run: echo "${{ github.head_ref }}"
      - run: echo start
          more ${{ github.head_ref }}
      - uses: actions/github-script@v7
        with:
          script: |
            core.info("${{ github.head_ref }}")
      - run: echo still fine
YML
[ "$(run_exprs "$WORK/wf/bad.yml" | wc -l | tr -d ' ')" = "9" ] \
  && ok "control: the run: expression check finds all 9 planted layouts (comment, inline, next line, anchor, tag, flow, wide dash, continuation, script:), not an env: value" \
  || bad "the run: expression check misread its fixture" "$(run_exprs "$WORK/wf/bad.yml")"
# *.yaml runs on GitHub too, and an empty glob must not read as "nothing found".
WFS=()
while IFS= read -r f; do [ -n "$f" ] && WFS[${#WFS[@]}]="$f"; done <<EOF
$(find "$KIT/.github/workflows" -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null | sort)
EOF
if [ "${#WFS[@]}" -eq 0 ]; then
  bad "no workflow file found to scan for run: expressions" ""
else
  EX="$(run_exprs "${WFS[@]}")"; rc=$?
  [ "$rc" = "0" ] && [ -z "$EX" ] \
    && ok "no run: script in the ${#WFS[@]} workflows (*.yml, *.yaml) holds an expression: event values come in through env:" \
    || bad "a workflow pastes an expression into a run: script (injection), or the scan failed (rc=$rc)" "$EX"
fi

echo; echo "── the seal key never reaches a command line (#14) ──"
if command -v openssl >/dev/null 2>&1; then
  hm() { (cd "$S" && VANTRY_ROOT="$S" bash -c '. scripts/lib/vantry-common.sh; _vantry_hmac_sha256 "$1" "$2"' _ "$1" "$2"); }
  same_hmac=1
  for key in k 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
             "$(printf '%0100d' 6)" '6\5c%s'; do
    want="$(printf '%s' 'payload é' | openssl dgst -sha256 -hmac "$key" | sed 's/.*= *//')"
    [ "$(hm "$key" 'payload é')" = "$want" ] || { same_hmac=0; bad "the stdin HMAC differs from openssl -hmac for a ${#key}-byte key" ""; }
  done
  [ "$same_hmac" = 1 ] && ok "the stdin-only HMAC equals openssl -hmac (short, 64-byte, long, pad-colliding keys)"
  rm -rf "$S/.vantry/state"; mkdir -p "$S/stub"
  REALSSL="$(command -v openssl)"
  printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" >> "%s/argv.log"\nexec "%s" "$@"\n' "$S" "$REALSSL" > "$S/stub/openssl"
  chmod +x "$S/stub/openssl"; : > "$S/argv.log"
  sealed="$(cd "$S" && PATH="$S/stub:$PATH" VANTRY_ROOT="$S" bash -c '. scripts/lib/vantry-common.sh; vantry_seal_compute "payload"' 2>/dev/null)"
  key="$(cat "$S/.vantry/state/seal.key" 2>/dev/null)"
  if [ -n "$key" ] && [ -s "$S/argv.log" ]; then
    grep -qF -- "$key" "$S/argv.log" && bad "the seal key appeared on an openssl command line" "" \
      || ok "openssl ran, and the seal key was on none of its command lines"
    [ "$sealed" = "$(printf 'payload' | openssl dgst -sha256 -hmac "$key" | sed 's/.*= *//')" ] \
      && ok "and the seal is the same HMAC as before (existing receipts stay valid)" \
      || bad "the seal changed value" ""
  else
    bad "the stub saw no openssl call, or no key was made" "key: ${key:+present}  log: $(wc -c < "$S/argv.log")"
  fi
else
  echo "  ↷ no openssl here — the seal falls back to a keyed sha over stdin"
fi

# The POSIX reading of `ls -ld`, on every OS: the branch is forced and ls is
# stubbed, so the pattern itself is exercised even where chmod means nothing.
# A `+` is an ACL that chmod 600 leaves in place — it must not pass as 600.
acl_ok=1
for c in '-rw------- 1 u g 0 k|0' '-rw-------. 1 u g 0 k|0' '-rw-------@ 1 u g 0 k|0' \
         '-rw-------+ 1 u g 0 k|1' '-rw-r--r-- 1 u g 0 k|1' '-rw-------|1' '|1'; do
  line="${c%|*}"; want="${c##*|}"
  got="$(seal "_VANTRY_UNAME=Linux; ls() { printf '%s\n' '$line'; }; _vantry_owner_only k; echo \$?" | tail -1)"
  [ "$got" = "$want" ] || { acl_ok=0; bad "the mode reading took '$line' as $got (want $want)" ""; }
done
[ "$acl_ok" = 1 ] && ok "POSIX: only -rw------- then a space, . or @ is owner-only; a + (an ACL) is refused"

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) echo "  ↷ chmod is not the restriction on Windows (the ACL is, tested above)" ;;
  *)
    O="$WORK/own"; mkdir -p "$O"; : > "$O/k"
    chmod 644 "$O/k"; r644="$(seal "_vantry_owner_only '$O/k'; echo \$?" | tail -1)"
    chmod 600 "$O/k"; r600="$(seal "_vantry_owner_only '$O/k'; echo \$?" | tail -1)"
    [ "$r644" = "1" ] && [ "$r600" = "0" ] \
      && ok "POSIX: a key the filesystem reports as readable by others is refused (644 → 1, 600 → 0)" \
      || bad "the owner-only check trusts chmod without reading it back" "644 → $r644  600 → $r600"
    # A key made before the readback existed already carries the marker, so a
    # check run only when the marker is missing never looked at it again.
    K="$S/.vantry/state/seal.key"; rm -rf "$S/.vantry/state"
    seal "vantry_seal_key >/dev/null"
    if [ -s "$K" ] && [ -e "$K.owner-only" ]; then
      chmod 644 "$K"; rk644="$(seal "vantry_seal_key >/dev/null; echo \$?" | tail -1)"
      chmod 600 "$K"; rk600="$(seal "vantry_seal_key >/dev/null; echo \$?" | tail -1)"
      [ "$rk644" = "1" ] && [ "$rk600" = "0" ] \
        && ok "POSIX: a key widened after its marker was written is refused on the next read (644 → 1, 600 → 0)" \
        || bad "the marker made a widened key trusted" "644 → $rk644  600 → $rk600"
    else
      bad "could not create a seal key to widen" ""
    fi ;;
esac

rm -rf "$WORK"
echo; echo "digest: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
