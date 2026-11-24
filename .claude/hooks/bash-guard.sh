#!/usr/bin/env bash
# =============================================================================
#  PreToolUse(Bash) — the four things an agent must not be able to do.
#
#  1. Forge evidence.        Writing a receipt by hand turns proof back into prose.
#  2. Disarm the gate.       Editing hooks/config mid-turn to get unstuck.
#  3. Commit or push unverified code.
#  4. Merge, when the project says a human merges.
#
#  Exit 2 blocks the tool call and returns the message to the model.
#  Anything not understood exits 0 — git and CI are the backstop, and a guard
#  that blocks on ambiguity gets uninstalled by lunchtime.
# =============================================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || printf '%s' "${CLAUDE_PROJECT_DIR:-$PWD}")"
[ -f "$ROOT/vantry.yml" ] || exit 0
# shellcheck source=../../scripts/lib/vantry-common.sh
. "$ROOT/scripts/lib/vantry-common.sh" 2>/dev/null || exit 0

payload="$(cat 2>/dev/null || true)"
cmd="$(vantry_json_get "$payload" tool_input.command)"
[ -n "$cmd" ] || exit 0

# Match INTENT, not payload. A commit message that merely mentions
# `--no-verify` is documentation; a command that passes it is an escape. Drop
# heredoc bodies and quoted spans before pattern-matching, or the guard fires
# on its own release notes — and a guard with false positives gets uninstalled.
scrub() {
  printf '%s\n' "$1" | awk '
    inhd { if ($0 ~ "^[[:space:]]*" tag "[[:space:]]*$") inhd = 0; next }
    {
      l = $0
      if (match(l, /<<-?[[:space:]]*'\''?"?[A-Za-z_][A-Za-z0-9_]*'\''?"?/)) {
        t = substr(l, RSTART, RLENGTH)
        sub(/^<<-?[[:space:]]*/, "", t); gsub(/['\''"]/, "", t)
        tag = t; inhd = 1
      }
      gsub(/"[^"]*"/, " ", l)
      gsub(/'\''[^'\'']*'\''/, " ", l)
      print l
    }'
}
scmd="$(scrub "$cmd")"
# The same command with the quoting UNDONE where it only glues a word together:
# `"pkill"`, `p"kill"`, `ki''ll` and `k\ill` all run the command they spell, and
# scrub() deleted them as if they were prose (#8, #9). A quoted span that holds
# whitespace is still prose — a commit message — and is blanked as above.
# Lower-cased, because Windows commands and PowerShell ignore case. Only the
# process rules of section 2b read this view, and only at a command position.
glue() {
  printf '%s\n' "$1" | awk '
    inhd { if ($0 ~ "^[[:space:]]*" tag "[[:space:]]*$") inhd = 0; next }
    {
      l = $0
      if (match(l, /<<-?[[:space:]]*'\''?"?[A-Za-z_][A-Za-z0-9_]*'\''?"?/)) {
        t = substr(l, RSTART, RLENGTH)
        sub(/^<<-?[[:space:]]*/, "", t); gsub(/['\''"]/, "", t)
        tag = t; inhd = 1
      }
      o = ""; i = 1; n = length(l)
      while (i <= n) {
        c = substr(l, i, 1)
        if (c == "\\") { o = o substr(l, i + 1, 1); i += 2; continue }
        # A $ just before a quote only changes how the quote is read: $"kill" runs kill.
        if (c == "$" && substr(l, i + 1, 1) ~ /["'\'']/) { i++; continue }
        if (c == "\"" || c == "'\''") {
          j = index(substr(l, i + 1), c)
          if (j == 0) { s = substr(l, i + 1); i = n + 1 } else { s = substr(l, i + 1, j - 1); i += j + 1 }
          # Quoted, a backslash is literal: in a word it is a Windows path
          # separator ("C:\Windows\System32\taskkill.exe"), so it reads as one.
          gsub(/\\/, "/", s)
          # A span with whitespace is prose, unless it is a path whose last
          # part has none ("C:\Program Files\Git\usr\bin\pkill.exe"): that is
          # a program name, kept as one word.
          if (s ~ /[[:space:]]/ && s ~ /\/[^\/[:space:]]+$/) gsub(/[[:space:]]/, "_", s)
          o = o ((s ~ /[[:space:]]/) ? " " : s)
          continue
        }
        o = o c; i++
      }
      print o
    }'
}
# gcase keeps the case: git's options are case-sensitive (`commit -n` skips the
# hooks, `-N` does not exist; `-S` signs, `-s` signs off). Everything else reads
# the lower-cased gcmd.
lower() { tr '[:upper:]' '[:lower:]'; }
_wrap=0
gcase="$(glue "$cmd")"
gcmd="$(printf '%s\n' "$gcase" | lower)"
# A wrapper defeats the scrub by design: sh -c puts the whole escape inside a
# quoted span, and scrub() removes quoted spans. When the command IS a wrapper,
# judge the raw text too — there, the quoting is the payload, not the packaging.
# PowerShell and cmd are how a Windows tool runs from this shell, and their
# payload is quoted almost always: `powershell -c "Stop-Process -Name node"`
# passed every rule below (#8). A shell reading a heredoc runs the heredoc.
# The wrapper is recognised in the glued view, so quoting its name hides nothing.
# A shell's -c may follow other options (`bash -e -c`, `--norc -c`), and a shell
# that reads its standard input runs whatever is piped to it (`… | sh`, `sh - <<`).
if printf '%s\n' "$gcmd" | LC_ALL=C grep -qE \
  'eval|xargs|powershell|pwsh|wsl|(^|[^a-z0-9_.-])(ba|z|da|k)?sh(\.exe)?[[:space:]]([^;&|]*[[:space:]])?-[a-z]*c[a-z]*([[:space:]]|$)|(^|[^a-z0-9_.-])cmd(\.exe)?[[:space:]][^;&|]*//?[ck]([[:space:]]|$)|(^|[^a-z0-9_.-])((ba|z|da|k)?sh|pwsh|powershell)(\.exe)?([[:space:]]+-[^[:space:]]*)*[[:space:]]*<<|\|[[:space:]]*([^[:space:];&|()]*/)?((ba|z|da|k)?sh|pwsh|powershell)(\.exe)?([[:space:]]|$)'; then
  _wrap=1
  scmd="$scmd $cmd"
  # Every quote deleted: inside a wrapper, the quoted text is the command, so
  # it is judged as one, heredoc bodies included. Twice, because a backslash
  # means two things there: an escape to the inner shell (`k\ill` is kill) and
  # a separator in a Windows path.
  gcase="$gcase
$(printf '%s\n' "$cmd" | tr -d "\"'\\\\")
$(printf '%s\n' "$cmd" | tr -d "\"'" | tr '\\\\' '/')"
  gcmd="$(printf '%s\n' "$gcase" | lower)"
fi
lcs="$(printf '%s\n' "$scmd" | lower)"

deny() { printf '%s\n' "$1" >&2; vantry_log "guard.deny" "$2"; exit 2; }

# --- 1. the receipt is harness-produced evidence -----------------------------
case "$scmd" in
  *".vantry/receipts"*)
    # The read-allowlist matched a VERB anywhere in the string, so
    # `cat > .vantry/receipts/main.verify.json <<EOF` was read as "a cat, that's
    # a read" and waved through. It is the exact command that forges a receipt.
    # Decide on the REDIRECT first: drop the harmless ones, and if any writing
    # redirect survives beside the receipts path, this is a write whatever verb
    # it opens with.
    wr="$(printf '%s\n' "$scmd" \
          | sed -e 's/2>&1//g' -e 's/[0-9]*>>*[[:space:]]*\/dev\/null//g' -e 's/&>[[:space:]]*\/dev\/null//g')"
    case "$wr" in
      *">"*|*"tee "*|*"dd "*|*"truncate"*|*"sed -i"*|*"cp "*|*"mv "*|*"install "*)
        deny "DENIED — that command WRITES into .vantry/receipts/.
  A receipt is harness-produced evidence: the whole gate rests on it being
  impossible to author. Only scripts/verify.sh writes one, and only by running
  the software. To record what you observed:
    scripts/verify.sh --observe \"<expected>\" \"<what you saw>\"" "write to receipts: $cmd" ;;
      # An interpreter's script is a heredoc or a quoted span, both scrubbed
      # above: the guard cannot see whether it reads or writes, so it refuses
      # even a read (#9). Deliberate — say so, and name the reads that pass.
      *"python"*|*"perl"*|*"ruby"*|*"node "*|*"awk "*)
        deny "DENIED — an interpreter beside .vantry/receipts/ can write a receipt, and
  the guard cannot see what its script does, so it is refused even to read.
  To READ receipts, use a command that cannot write:
    scripts/verify.sh --status
    jq -r '.verdict' .vantry/receipts/<file>.json
    for f in .vantry/receipts/*.json; do jq -c '{verdict, steps}' \"\$f\"; done" "write to receipts: $cmd" ;;
    esac
    case "$scmd" in
      *cat*|*ls*|*grep*|*jq*|*head*|*tail*|*find*|*wc*|*diff*|*stat*) : ;;   # a genuine read
      *)
        deny "DENIED — .vantry/receipts/ is harness-produced evidence.
  Only scripts/verify.sh may write a receipt, and only by actually running the
  software. To record what you observed:
    scripts/verify.sh --observe \"<expected>\" \"<what you saw>\"" "write to receipts: $cmd" ;;
    esac ;;
esac

# --- 2. never let the gate be disarmed from inside a turn --------------------
# Git reads config keys and Windows reads environment names without regard to
# case, and a quoted word still runs: `core.hookspath`, `"--no-verify"` and
# `$env:vantry_skip_gate` passed the case-sensitive match on the scrubbed text.
# So these read the lower-cased scrubbed view AND the glued view.
_hooks_msg="DENIED — core.hooksPath is not yours to change. Setting it disables
  every git hook in this repo (that exact line is what broke v1).
  Use: scripts/lib/enable-hooks.sh [--status|--disable]"
_nv_msg="DENIED — that skips the git hooks: the secret scan and the verification gate.
  If the change is genuinely unverifiable, say so and use the recorded route:
    scripts/verify.sh --override \"<why, >=20 chars>\""
case "$lcs
$gcmd" in
  *"core.hookspath"*)
    # Set for ONE command (git -c, --config-env, GIT_CONFIG_*), it is never a
    # read, whatever else the line does: refused before any read exemption.
    if printf '%s\n' "$gcmd" | LC_ALL=C grep -qE \
         '(^|[[:space:]])(-c[[:space:]]*|--config-env[[:space:]=]+)core\.hookspath|git_config_(parameters|key_[0-9]+)=[^[:space:]]*core\.hookspath'; then
      deny "$_hooks_msg" "hooksPath: $cmd"
    fi
    case "$lcs" in *--get*|*--list*|*cat*|*grep*|*"enable-hooks.sh"*) ;; *)
    deny "$_hooks_msg" "hooksPath: $cmd" ;; esac ;;
esac
case "$lcs
$gcmd" in
  *"--no-verify"*) deny "$_nv_msg" "no-verify: $cmd" ;;
  *"vantry_skip_gate="*|*"env:vantry_skip_gate"*)
    deny "DENIED — VANTRY_SKIP_GATE is a human's emergency lever, not an agent's.
  Use scripts/verify.sh --override \"<why>\" so the decision is committed and reviewed." "skip-gate: $cmd" ;;
  # The hooks answer enable-hooks' reachability probe and exit. They now answer
  # only the probe's own call, and an agent never sets the variable either.
  *"vantry_hook_probe="*|*"env:vantry_hook_probe"*)
    deny "DENIED — VANTRY_HOOK_PROBE is how scripts/lib/enable-hooks.sh --status asks whether a
  hook is reached. Set around a commit or a push it is a way past the hooks.
  Run scripts/lib/enable-hooks.sh --status to ask that question." "hook-probe: $cmd" ;;
esac
case "$scmd" in
  rm*" .githooks"*|rm*" .claude/hooks"*|rm*" vantry.yml"*|rm*/.githooks*|rm*/vantry.yml*|*"rm -rf .vantry"*)
    deny "DENIED — removing the verification machinery is not a way to pass it." "rm gate: $cmd" ;;
esac
# A hook rewritten by the shell in the same command as a push — `printf 'exit 0'
# > .githooks/pre-push && git push` — is gutted before git runs it, while every
# check above saw the hook as committed (security review, 19 Nov 2026). The
# machinery changes through the Edit tool and a reviewed commit, never through
# a redirect, a move, a mode change or an in-place rewrite.
_mach='(\.githooks|\.claude[/\\]hooks|scripts[/\\]verify\.sh|scripts[/\\]lib[/\\])'
_abbr() {        # $1 = what was typed  $2 = an option's full name → 0 when $1 abbreviates it
  case "$2" in "$1"*) return 0 ;; esac
  return 1
}
_ism() {         # $1 = a word → 0 when it names the machinery, in any case
  local v="$1"
  case "$v" in *[A-Z]*) v="$(printf '%s' "$v" | lower)" ;; esac
  [[ $v =~ $_mach ]]
}
# A redirection is the shell's, not the command's: `2>/dev/null`, `10>/dev/null`,
# `<<< x`, `{fd}>&-`. A bare operator takes the next word as its target, which
# names no operand either (security review, 19 Nov 2026).
_rd_re='^([0-9]+|\{[A-Za-z_][A-Za-z0-9_]*\})?(<<<|<<-?|<>|>>?|>\||<|&>>?|>&|<&)'
_is_redir() {    # $1 = a word → 0 when it is one; then _rd_bare=1 when its target is the next word
  [[ $1 =~ $_rd_re ]] || return 1
  _rd_bare=0; [ "${#BASH_REMATCH[0]}" = "${#1}" ] && _rd_bare=1
  return 0
}
# Where a write lands over the machinery: on it, or on a directory above it —
# a directory copied into `.`, `.claude` or `scripts` replaces what is there.
_cp_lands() {    # $1 = a path relative to the working tree
  local p="${1//\\//}"
  case "$p" in *[A-Z]*) p="$(printf '%s' "$p" | lower)" ;; esac
  while :; do case "$p" in *//*) p="${p//\/\///}" ;; *) break ;; esac; done
  while :; do case "$p" in ./*) p="${p#./}" ;; */.) p="${p%/.}" ;; ?*/) p="${p%/}" ;; *) break ;; esac; done
  case "$p" in ''|.|.claude|scripts) return 0 ;; esac
  [[ $p/ =~ $_mach ]]              # `scripts/lib` is the directory scripts/lib/
}
# Where a copy, a move, a link or a sync writes: its destination — the last
# operand, or the value of -t / --target-directory / -Destination — and, when
# that is a directory (`.`, `./`, `scripts/`), each source's name inside it:
# `cp -r /tmp/x/.githooks .` writes .githooks. An option that takes a value is
# skipped with it wherever it stands (`install X .githooks/pre-push -m 755`), a
# cluster of short options is read letter by letter (`cp -vt .githooks X`), a
# long option by any prefix of its name (`--target`), and a redirection names
# no operand (security review, 19 Nov 2026). Copying the machinery OUT stays
# open. A destination outside the working tree's relative paths (absolute,
# `~`, `..`) is judged by its own name only.
_ps_val='path literalpath pspath lp filter include exclude credential fromsession tosession erroraction warningaction informationaction errorvariable warningvariable informationvariable outvariable outbuffer pipelinevariable progressaction'
_cpwrite() {     # $1 = the command, lower-cased   $2… = its words → 0 when it writes the machinery
  local c="$1" w nx="" ac="" la="" hast=0 ps=0 eo=0 o k v n dst b
  local -a op=() src=() tg=()      # every destination named is judged, not the last
  shift
  case "$c" in
    cp|mv)   ac="St"     la="--suffix --no-preserve --sparse" ;;
    ln)      ac="St"     la="--suffix" ;;
    install) ac="Stmog"  la="--suffix --mode --owner --group --strip-program" ;;
    rsync)   ac="efBTM@" la="--exclude --include --filter --rsh --rsync-path --temp-dir --compare-dest --copy-dest --link-dest --partial-dir --backup-dir --suffix --log-file --log-file-format --password-file --chmod --chown --usermap --groupmap --files-from --exclude-from --include-from --timeout --contimeout --port --bwlimit --max-size --min-size --block-size --modify-window --compress-level --compress-choice --skip-compress --out-format --iconv --checksum-choice --max-delete --max-alloc --sockopts --address --protocol --outbuf --remote-option --info --debug --stop-after --stop-at --write-batch --only-write-batch --read-batch --early-input" ;;
    *)       ps=1 ;;    # Copy-Item, Move-Item and their aliases: PowerShell parameters
  esac
  for w in "$@"; do
    case "$nx" in
      t) tg+=("$w") hast=1 nx=""; continue ;;
      p) src+=("$w") nx=""; continue ;;
      s) nx=""; continue ;;
    esac
    if _is_redir "$w"; then [ "$_rd_bare" = 1 ] && nx=s; continue; fi
    if [ "$eo" = 0 ]; then
      case "$w" in
        --) eo=1; continue ;;
        # -Destination, by any prefix PowerShell accepts — also behind the cp
        # and mv aliases, where GNU would refuse the word (it has no -e).
        -[Dd][Ee][Ss]*)
          if [ "$ps" = 1 ] || [ "$c" = cp ] || [ "$c" = mv ]; then
            v="${w%%:*}"; v="$(printf '%s' "${v#-}" | lower)"
            if _abbr "$v" destination; then
              case "$w" in *:*) tg+=("${w#*:}") hast=1 ;; *) nx=t ;; esac
              continue
            fi
          fi ;;
      esac
      if [ "$ps" = 1 ]; then
        case "$w" in -?*)
          case "$w" in
            *:*) case "$(printf '%s' "${w%%:*}" | lower)" in -p*|-l*) src+=("${w#*:}") ;; esac ;;
            *) v="$(printf '%s' "${w#-}" | lower)"
               for o in $_ps_val; do case "$o" in "$v"*) nx=s; break ;; esac; done
               case "$v" in lp|p|pa|pat|path|l*|ps*) [ "$nx" = s ] && nx=p ;; esac ;;
          esac
          continue ;;
        esac
      else
        case "$w" in
          --?*=*)
            v="${w%%=*}"
            if [ "$c" != rsync ] && [ "${#v}" -ge 3 ]; then
              _abbr "$v" --target-directory && { tg+=("${w#*=}") hast=1; }
            fi
            continue ;;
          --?*)
            if [ "${#w}" -ge 3 ]; then
              for o in $la; do _abbr "$w" "$o" && { nx=s; break; }; done
              if [ "$c" != rsync ]; then _abbr "$w" --target-directory && nx=t; fi
            fi
            continue ;;
          -?*)    # a cluster: the first letter that takes a value ends it
            k=1 n=${#w}
            while [ "$k" -lt "$n" ]; do
              o="${w:$k:1}"
              case "$ac" in *"$o"*)
                v="${w:$((k + 1))}"
                if [ "$o" = t ] && [ "$c" != rsync ]; then
                  if [ -n "$v" ]; then tg+=("$v") hast=1; else nx=t; fi
                elif [ -z "$v" ]; then nx=s; fi
                break ;;
              esac
              k=$((k + 1))
            done
            continue ;;
        esac
      fi
    fi
    op+=("$w")
  done
  n=${#op[@]}
  if [ "$hast" = 1 ]; then
    src+=(${op[@]+"${op[@]}"})          # bash 3.2 under set -u: an empty array is unbound
  elif [ "$ps" = 1 ]; then
    # Path, then Destination, by position — unless Path was named.
    if [ "${#src[@]}" -gt 0 ]; then tg=("${op[0]:-.}")
    else src=(${op[@]+"${op[@]:0:1}"}); tg=("${op[1]:-.}"); fi
  elif [ "$n" -ge 2 ]; then
    tg=("${op[$((n - 1))]}"); src=("${op[@]:0:$((n - 1))}")
  elif [ "$n" = 1 ] && [ "$c" = ln ]; then
    tg=(.); src=("${op[0]}")             # `ln -s <target>` links it here
  else
    return 1
  fi
  for dst in ${tg[@]+"${tg[@]}"}; do
    _ism "$dst/" && return 0
    case "$dst" in /*|'~'*|'$'*|[A-Za-z]:*|..|../*|..\\*) continue ;; esac
    for w in ${src[@]+"${src[@]}"}; do
      w="${w//\\//}"
      case "$w" in */|*/.|.) _cp_lands "$dst" && return 0 ;; esac    # its contents
      while :; do case "$w" in ?*/) w="${w%/}" ;; */.) w="${w%/.}" ;; *) break ;; esac; done
      b="${w##*/}"
      case "$b" in
        *[*?[]*) _cp_lands "$dst" && return 0 ;;    # a pattern may name any of them
        *) _cp_lands "$dst/$b" && return 0 ;;
      esac
    done
  done
  return 1
}
# A mode change is harmless only when it adds permissions — `+x`, `u+x`,
# `a+rx,g+w`. An octal mode, a removal, `=`, `--reference` can take the execute
# bit off a hook, and git skips a hook that is not executable (security
# review, 19 Nov 2026).
_cm_ok='^[ugoa]*\+[rwxXst]+(,[ugoa]*\+[rwxXst]+)*$'
_chmodw() {      # $@ = chmod's words → 0 when it changes a machinery file's mode other than by adding
  local w seen=0 bad=0 any=0 eo=0 nx=0
  for w in "$@"; do
    [ "$nx" = 1 ] && { nx=0; continue; }
    if _is_redir "$w"; then nx="$_rd_bare"; continue; fi
    if [ "$eo" = 0 ]; then
      case "$w" in
        --) eo=1; continue ;;
        --reference*) bad=1 seen=1; continue ;;
        --*) continue ;;
        -*[!Rcfv]*) bad=1 seen=1; continue ;;    # `-x`, `-w`: a mode, not an option
        -?*) continue ;;
      esac
    fi
    if [ "$seen" = 0 ]; then
      seen=1; [[ $w =~ $_cm_ok ]] || bad=1
    else
      _ism "$w" && any=1
    fi
  done
  [ "$any" = 1 ] && [ "$bad" = 1 ]
}
_mwrite() {      # $1 = a segment, case kept → 0 when it writes the machinery
  local -a W rest; local n k=0 w cw m
  read -r -a W <<<"$1"; n=${#W[@]}
  while [ "$k" -lt "$n" ]; do
    cw="${W[$k]##*/}"; cw="${cw##*\\}"
    case "$cw" in *[A-Z]*) cw="$(printf '%s' "$cw" | lower)" ;; esac
    cw="${cw%.exe}"; rest=("${W[@]:$((k + 1))}")
    # PowerShell's short aliases (`sc`, `ni`, `del`, `copy`) count only where a
    # command starts: anywhere else they are a search pattern's words.
    case "$cw" in sc|ac|clc|rni|ren|ri|del|erase|ni|mi|move|copy|cpi) [ "$k" = 0 ] || cw=":$cw" ;; esac
    case "$cw" in
      chown|truncate|tee|unlink|shred|set-content|sc|add-content|ac|out-file|clear-content|clc|rename-item|rni|ren|remove-item|ri|del|erase|new-item|ni)
        for w in ${rest[@]+"${rest[@]}"}; do _ism "$w" && return 0; done ;;
      mv|move|mi|move-item)
        for w in ${rest[@]+"${rest[@]}"}; do _ism "$w" && return 0; done
        _cpwrite "$cw" ${rest[@]+"${rest[@]}"} && return 0 ;;
      sed|perl)
        m=0; for w in ${rest[@]+"${rest[@]}"}; do case "$w" in --in-place*) m=1 ;; --*) ;; -*[iI]*) m=1 ;; esac; done
        [ "$m" = 1 ] && for w in ${rest[@]+"${rest[@]}"}; do _ism "$w" && return 0; done ;;
      dd)
        for w in ${rest[@]+"${rest[@]}"}; do case "$w" in [oO][fF]=*) _ism "$w" && return 0 ;; esac; done ;;
      cp|install|ln|rsync|copy-item|copy|cpi)
        _cpwrite "$cw" ${rest[@]+"${rest[@]}"} && return 0 ;;
      chmod)
        _chmodw ${rest[@]+"${rest[@]}"} && return 0 ;;
    esac
    k=$((k + 1))
  done
  return 1
}
_mw=0
printf '%s\n' "$gcmd" | LC_ALL=C grep -qE ">[>|]?[[:space:]]*[^[:space:];&|<>]*$_mach" && _mw=1
if [ "$_mw" = 0 ]; then
  while IFS= read -r _seg; do _mwrite "$_seg" && { _mw=1; break; }; done <<EOF
$(printf '%s\n' "$gcase" | tr ';&|()\140' '\n\n\n\n\n\n')
EOF
fi
if [ "$_mw" = 1 ]; then
  deny "DENIED — this command rewrites the verification machinery (.githooks/, .claude/hooks/,
  scripts/verify.sh, scripts/lib/) from the shell. A hook rewritten in the same
  command as a push is never judged. Change these files with the Edit tool and a
  reviewed commit; git checkout -- <file> restores one." "machinery write: $cmd"
fi

# --- 2b. never stop another project's processes --------------------------------
# 17 Oct 2026: two projects on one machine both ran scripts/verify.sh. An agent
# clearing ITS stuck gate killed every process whose command line matched
# verify.sh, and with them the other project's 75-minute gate, three times in a
# day. A process is chosen by PID, after checking it is yours; never by name.
# Windows commands and PowerShell parameters are case-insensitive and may be
# abbreviated: `TASKKILL /F /IM`, `stop-process -n`, `spps -na` all stop by name,
# and every one of them passed a case-sensitive, exact-spelling match (#8).
# So: match a lower-cased copy, and match the abbreviations.
lc="$(printf '%s\n' "$scmd" | tr '[:upper:]' '[:lower:]')"
# A COMMAND POSITION in the glued view: the start of a line; after ; & | ( { or
# a backtick (so $( too); after do/then/else; as the payload of a shell's or
# PowerShell's -c/-Command, or of cmd's /c and /k; each optionally behind
# sudo, exec, nohup, env, time, xargs, wsl, start… with their flags and a flag's
# value (`sudo -u me`), behind `timeout <duration>`, builtin, `!`, if/while/until,
# or VAR=value; then optionally a directory (`/bin/kill`, "C:\…\taskkill.exe").
# Anchoring there is what lets the glued view see `"pkill" -f x` without
# refusing a command whose ARGUMENT merely spells pkill.
_w='(^|[^a-z0-9_.-])'
_cp='(^|[;&|({`]|'"$_w"'((ba|z|da|k)?sh|powershell|pwsh)(\.exe)?[[:space:]][^;&|]*-[a-z]*c[a-z]*[[:space:]]|'"$_w"'cmd(\.exe)?[[:space:]][^;&|]*//?[ck][[:space:]]|[[:space:]](do|then|else)[[:space:]])[[:space:]]*(([a-z_][a-z0-9_]*=[^[:space:]]*|!|if|elif|while|until|do|then|else|builtin|timeout([[:space:]]+-[^[:space:]]+)*[[:space:]]+[0-9][^[:space:]]*|(sudo|doas|exec|nohup|command|env|time|nice|xargs|wsl|start)([[:space:]]+[-/][^[:space:]]+([[:space:]]+[^-/[:space:]][^[:space:]]*)?)*)[[:space:]]+)*([^[:space:];&|()`]*/)?'
_byname='((pkill|killall)(\.exe)?([[:space:]]|$)|taskkill(\.exe)?[[:space:]][^;&|]*[/-]+(im|fi)([[:space:]:=]|$)|(stop-process|spps|kill)[[:space:]]+([^;&|]*[[:space:]])?-(n[a-z]*|pr[a-z]*)([[:space:]:]+[^0-9[:space:]-]|[[:space:]]*$)|tskill(\.exe)?[[:space:]]+[^0-9[:space:]]|wmic(\.exe)?[[:space:]][^;&|]*process[^;&|]*(delete|terminate))'
if printf '%s\n' "$lc" | grep -qE \
  'pkill|killall|taskkill[^;&|]*[[:space:]][/-]+(im|fi)([[:space:]:=]|$)|(^|[^a-z0-9_-])(stop-process|spps|kill)[[:space:]]+([^;&|]*[[:space:]])?-(n[a-z]*|pr[a-z]*)([[:space:]:]+[^0-9[:space:]-]|[[:space:]]*$)|wmic[^;&|]*process[^;&|]*(delete|terminate)' \
   || printf '%s\n' "$gcmd" | grep -qE "$_cp$_byname"; then
    deny "DENIED — that stops processes by NAME or PATTERN, on the whole machine.
  Other projects run the same tools (bash, java, node, scripts/verify.sh) here,
  and a pattern cannot tell their processes from yours. List first, then stop
  the PIDs whose working directory is THIS project, one command per step:
    ps -ef | grep <what>
    readlink /proc/<pid>/cwd
    kill <pid>" "kill by name: $cmd"
fi
_select_kill="DENIED — that selects processes and stops them in one command.
  Whatever the filter matches on this machine is stopped, including another
  project's gate or server. List the processes, check each one's working
  directory, then stop the PIDs that are yours in a separate command."
# A process LISTING is the step this guard's own message asks for; it is
# dangerous only when the same command can stop what it lists (#9). The guard
# cannot follow data through a pipe, a variable or a loop, so it does not try:
# a listing verb AND a stop verb, each at a command position anywhere in the
# command, is a refusal. `pgrep x | while read p; do kill "$p"; done` and
# `k\ill $(pgrep x)` both passed the old $(…)-only, whole-word check.
_lists='(pgrep|pidof|ps|get-process|gps|tasklist|get-ciminstance|gcim|get-wmiobject|gwmi|wmic)(\.exe)?([[:space:];&|)}`]|$)'
_stops='(kill|tskill|taskkill|stop-process|spps|pkill|killall)(\.exe)?([[:space:];&|)}`]|$)'
if printf '%s\n' "$gcmd" | grep -qE "$_cp$_lists" \
   && printf '%s\n' "$gcmd" | grep -qE "$_cp$_stops|\.(kill|terminate)[[:space:]]*\(|invoke-(cim|wmi)method|call[[:space:]]+terminate"; then
  deny "$_select_kill" "select-and-kill: $cmd"
fi
# And the older rule, kept beside it: a listing inside $(…) or backticks, and a
# stop verb as a whole word ANYWHERE in the raw command. The rule above needs
# the verb at a command position it can recognise; this one does not, so a
# form that position misses (a prefix it does not know) is still refused.
case "$lc $gcmd" in
  *'$(pgrep'*|*'$(pidof'*|*'$(ps '*|*'`pgrep'*|*'`pidof'*|*'`ps '*)
    if printf '%s\n' "$cmd" | tr '[:upper:]' '[:lower:]' \
         | grep -qE '(^|[^a-z0-9_-])(kill|tskill|taskkill|stop-process|spps|pkill|killall)([^a-z0-9_-]|$)|terminate'; then
      deny "$_select_kill" "select-and-kill: $cmd"
    fi ;;
esac
case "$lc" in
  *"xargs kill"*|*"xargs -r kill"*|*"| kill"*|*"|kill"*|\
  *"| stop-process"*|*"|stop-process"*|*"foreach-object { stop-process"*|*"% { stop-process"*|\
  *get-process*stop-process*|*win32_process*stop-process*|*win32_process*terminate*|*win32_process*taskkill*|*tasklist*taskkill*)
    deny "$_select_kill" "select-and-kill: $cmd" ;;
esac
# An explicit PID: the guard can see where an MSYS/Linux process runs. One that
# works inside a DIFFERENT git working tree is another project's.
case "$scmd" in
  *kill*)
    _me="$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$ROOT")"
    for _pid in $(printf '%s\n' "$scmd" | grep -oE '(^|[^A-Za-z0-9_./:-])-?[0-9]{2,}' | grep -oE '[0-9]+'); do
      _cwd="$(readlink "/proc/$_pid/cwd" 2>/dev/null)" || continue
      [ -n "$_cwd" ] || continue
      _top="$(git -C "$_cwd" rev-parse --show-toplevel 2>/dev/null)" || continue
      [ "$_top" = "$_me" ] && continue
      deny "DENIED — PID $_pid works in $_top, another project.
  It is not yours to stop. If it blocks you (a port, a lock), say so and let a
  human decide." "kill other project: $_pid $_top"
    done ;;
esac

# --- 3. push / PR require a fresh passing receipt; commit only at strict -------
# What leaves the machine is what must be proven. A commit is local and undone
# with one command, so `git commit` is gated only at strictness: strict — the
# policy .githooks/pre-commit has always applied to humans ("a gate that refuses
# every save is a gate that gets uninstalled by Friday"). The guard used to gate
# the agent harder than the human: at standard an agent could not save work in
# small commits without first re-running the whole contract (1h45 in one
# adopting repository), and the only way out it was offered was an override.
# The project owner asked for the agent to commit and open PRs itself; the
# merge stays human (section 4). `git push` and `gh pr create` stay gated at
# every strictness, .githooks/pre-push refuses an unverified ref, CI re-runs
# the contract, and the Stop hook still refuses to end a turn on unverified
# work: nothing unverified leaves the machine or is reported as done.
#
# 17 Nov 2026, in an adopting repository: eleven refs went out in one push, ten
# of them branches no receipt had ever covered, and their pull requests failed
# in CI. Whatever let that push out, this section could not have stopped it: it
# judged only the branch the agent was STANDING on, and matched the words
# `git push` / `gh pr create`. `git push origin a b c` from a verified branch,
# `git -C . push`, `gh pr create --head other` and `gh api …/pulls` all passed.
# So the command is now READ, word by word: every branch it publishes or opens
# a pull request from is judged by its OWN receipt — the question
# .githooks/pre-push asks of each ref — and every branch that fails is named in
# one refusal, so a single round of verification clears the retry.
#
# Every gated command is still judged as this project's, even one aimed at a
# throwaway repository: the target is usually a variable (`cd "$T"`, `-C "$R"`)
# the guard cannot resolve, and guessing "not ours" would let any unverified
# push through by naming a path (#9). A branch it cannot resolve (one held in a
# variable) is judged as the current branch; pre-push, which receives the real
# refs from git, judges it again.
_gate_cur=0 _gate_refs="" _refused="" _saw_push=0 _saw_pr=0 _merge=0
_pr_head="" _pr_base="" _remote="" _cur="" _head_sha="" _dflt="" _human=0 _switched=0
_elsewhere=0 _moved=0 _saw_pr_edit=0 _pr_bodyset=0 _pr_bfile="" _pr_fill=0 _pr_web=0
_tool="$(vantry_json_get "$payload" tool_name)"
# Where the command runs: a `cd` or `git -C` is resolved from there.
_pwd="$(vantry_json_get "$payload" cwd)"; [ -n "$_pwd" ] && [ -d "$_pwd" ] || _pwd="$PWD"
_root_top="$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null)"
lraw="$(printf '%s\n' "$cmd" | lower)"
# The API routes are read with quotes and backslashes removed, as the shell
# removes them: `pu''lls/1/merge` and `merge''Branch` are the same request
# (security review, 18 Nov 2026).
lraw_q="$(printf '%s\n' "$lraw" | tr -d "\"'\\\\")"
gcase_q="$(printf '%s\n' "$gcase" | tr -d "\"'\\\\")"
# An HTTP client asked to write: a method, or a body (which makes curl POST).
_M='([Pp][Oo][Ss][Tt]|[Pp][Uu][Tt]|[Pp][Aa][Tt][Cc][Hh]|[Dd][Ee][Ll][Ee][Tt][Ee])'
_http_write="(^|[[:space:]])((-X|--request|--method|-[Mm][Ee][Tt][Hh][Oo][Dd])[[:space:]=]*$_M|[Hh][Tt][Tt][Pp][Ss]?[[:space:]]+$_M|[Xx][Hh][Ss]?[[:space:]]+$_M|-d|--data[a-z-]*|--json|-T|--upload-file|--post-data|--post-file|--body-data|--body-file|-[Bb][Oo][Dd][Yy]|-[Ii][Nn][Ff][Ii][Ll][Ee])([[:space:]=]|\$)"

_refuse() {      # once each: the command may be read twice (see the dispatch)
  case "$_refused" in *"· $1"*) return 0 ;; esac
  _refused="$_refused
  · $1"; }
# A ref written through the GitHub API is a publication no push carries:
# .githooks/pre-push never runs, and the commit it lands is a field this guard
# does not resolve. Refused at every strictness, like a raw commit by sha.
_api_write() { _refuse "$1 — that writes a branch on GitHub without a push.
    Neither .githooks/pre-push nor this guard can tell which commit it lands, so
    no receipt can vouch for it. Push the branch with git: it is judged like any
    other push."; }
_unread() { _refuse "$1 — the guard cannot tell which command that runs, so it cannot
    judge it. Spell the subcommand out."; }
_sha() { git -C "$ROOT" rev-parse -q --verify "$1^{commit}" 2>/dev/null; }
_is_branch() {   # a local branch, by a name git itself accepts
  case "$1" in ""|-*|*'$'*) return 1 ;; esac
  git -C "$ROOT" check-ref-format --branch "$1" >/dev/null 2>&1 &&
    git -C "$ROOT" rev-parse -q --verify "refs/heads/$1" >/dev/null 2>&1
}
_add_ref() {     # $1 = a local branch   $2 = push|pr
  local s t
  [ "$1" = "$_cur" ] && { _gate_cur=1; return 0; }
  if [ "$2" = "push" ]; then
    # Nothing new leaves: git does not even hand an up-to-date ref to pre-push.
    s="$(_sha "refs/heads/$1")"
    t="$(_sha "refs/remotes/${_remote:-origin}/$1")"
    [ -n "$s" ] && [ "$s" = "$t" ] && return 0
    [ -n "$s" ] && vantry_published "$s" && return 0
  fi
  case " $_gate_refs " in *" $1 "*) ;; *) _gate_refs="$_gate_refs $1" ;; esac
}
_push_dst() {    # $1 = destination   $2 = the commit it would receive, if known
  # git resolves `heads/main` and `refs/heads/main` to the same branch.
  local d="${1#refs/}"
  d="${d#heads/}"
  [ "$_human" = 1 ] || return 0
  # A destination held in a variable may be the deploy branch: `feat:$B`.
  case "$d" in *'$'*|*'`'*)
    _refuse "a push to '$d' — the guard cannot tell which branch that is, and under
    merge.authority: human a push onto the branch that deploys is a merge. Name
    the destination branch."
    return 0 ;;
  esac
  [ -n "$_dflt" ] && [ "$d" = "$_dflt" ] || return 0
  # Already in the deployed branch: the push adds nothing to it.
  [ -n "$2" ] && git -C "$ROOT" merge-base --is-ancestor "$2" "refs/remotes/origin/$_dflt" 2>/dev/null && return 0
  _refuse "a push to $d — the branch that deploys. merge.authority is human, and a push
    that lands commits on it IS a merge. Open a pull request; a person merges it."
}
_push_del() {    # $1 = a branch a push deletes on the remote
  local d="${1#+}"
  d="${d#refs/}"; d="${d#heads/}"
  [ "$_human" = 1 ] || return 0
  case "$d" in *'$'*|*'`'*)
    _refuse "deleting '$d' on the remote — the guard cannot tell which branch that is,
    and under merge.authority: human the branch that deploys is a person's to change.
    Name the branch."
    return 0 ;;
  esac
  [ -n "$_dflt" ] && [ "$d" = "$_dflt" ] || return 0
  _refuse "deleting $d on the remote — the branch that deploys. merge.authority is human:
    a person changes it, not a session."
}
# Where a push that names no destination lands. git maps it through
# remote.<name>.push, and with push.default=upstream through the upstream, so
# `git push` from a branch that tracks main can write main (security review,
# 18 Nov 2026). Empty when it lands on the branch's own name.
_mapped_dst() {  # $1 = a local branch
  local r pd
  r="$(git -C "$ROOT" for-each-ref --format='%(push:remoteref)' "refs/heads/$1" 2>/dev/null)"
  if [ -z "$r" ]; then
    pd="$(git -C "$ROOT" config --get push.default 2>/dev/null)"
    case "$pd" in upstream|tracking)
      r="$(git -C "$ROOT" for-each-ref --format='%(upstream)' "refs/heads/$1" 2>/dev/null)"
      r="${r#refs/remotes/*/}" ;;
    esac
  fi
  printf '%s' "${r#refs/heads/}"
}
# A push that names no branch, or names HEAD, after the same command switched
# branch: the branch read before the command ran is not the one it publishes.
# The same after a `cd`, `git -C`, --git-dir or GIT_DIR that leaves this
# repository: the push publishes another repository's branch (security review,
# 19 Nov 2026). A `cd` or `-C` that stays in this working tree changes nothing.
_push_switched() {
  [ "$_switched" = 1 ] || [ "$_elsewhere" = 1 ] || [ "$_moved" = 1 ] || return 0
  _refuse "$1 — this command switches branch or repository before it pushes, so the
    guard cannot tell which branch the push publishes. Name it (git push origin
    <branch>), or run the push as a command of its own, from this repository."
}
# Does a `cd <dir>` or `git -C <dir>` stay in this working tree? Resolved from
# where the command runs; anything computed, or not resolvable, counts as a move.
_stays() {
  local d="$1" top
  case "$d" in ""|-|'~'*|*'$'*|*'`'*) return 1 ;; esac
  top="$(cd "$_pwd" 2>/dev/null && cd -- "$d" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null)" || return 1
  [ -n "$top" ] && [ "$top" = "$_root_top" ]
}
_push_spec() {   # one refspec of a git push
  local s="${1#+}" src dst sha m p q mid col=0
  src="${s%%:*}"; dst="$src"
  case "$s" in *:*) dst="${s#*:}"; col=1 ;; esac
  # `:dst` deletes: it publishes nothing, but the deploy branch is not deleted.
  [ -n "$src" ] || { _push_del "$dst"; return 0; }
  # Every way out below still asks where the push LANDS (_push_dst): an
  # unresolved source or a tag pushed onto the deploy branch is a merge too.
  case "$src" in
    *'$'*|*'`'*|-*) _gate_cur=1; [ "$col" = 1 ] && _push_dst "$dst" ""; return 0 ;;
    HEAD|@) _gate_cur=1; _push_switched "git push $s"; [ "$dst" = "$src" ] && dst="$_cur"
            _push_dst "$dst" "$_head_sha"
            if [ "$col" = 0 ] && [ -n "$_cur" ]; then
              m="$(_mapped_dst "$_cur")"; [ -n "$m" ] && _push_dst "$m" "$_head_sha"
            fi
            return 0 ;;
    refs/tags/*) _push_dst "$dst" "$(_sha "$src")"; return 0 ;;  # pre-push judges the tag
    refs/heads/*) src="${src#refs/heads/}" ;;
  esac
  case "$src" in
    *'*'*)   # a pattern: every local branch it matches. git allows one `*`,
             # and there it crosses `/`: a prefix and a suffix, nothing more.
      p="${src%%\**}"; q="${src#*\*}"
      while IFS= read -r m; do
        m="${m#refs/heads/}"
        case "$m" in "$p"*"$q") ;; *) continue ;; esac
        _add_ref "$m" push
        mid="${m#"$p"}"; mid="${mid%"$q"}"
        case "$dst" in *'*'*) _push_dst "${dst/\*/$mid}" "$(_sha "refs/heads/$m")" ;;
                       *) _push_dst "$m" "$(_sha "refs/heads/$m")" ;; esac
      done <<EOF
$(git -C "$ROOT" for-each-ref --format='%(refname)' refs/heads/ 2>/dev/null)
EOF
      return 0 ;;
  esac
  if _is_branch "$src"; then
    _add_ref "$src" push; _push_dst "$dst" "$(_sha "refs/heads/$src")"
    if [ "$col" = 0 ]; then
      m="$(_mapped_dst "$src")"; [ -n "$m" ] && _push_dst "$m" "$(_sha "refs/heads/$src")"
    fi
    return 0
  fi
  if git -C "$ROOT" rev-parse -q --verify "refs/tags/$src" >/dev/null 2>&1; then
    _push_dst "$dst" "$(_sha "refs/tags/$src")"; return 0
  fi
  sha="$(_sha "$src")"
  [ -n "$sha" ] || { _gate_cur=1; _push_dst "$dst" ""; return 0; }
  _push_dst "$dst" "$sha"
  [ "$sha" = "$_head_sha" ] && { _gate_cur=1; return 0; }
  vantry_published "$sha" && return 0      # already on the base: it came through a PR
  _refuse "$src ($(printf '%.8s' "$sha")) is a commit, not a branch, and no receipt covers it.
    Receipts are kept per branch: push the branch that holds it, by name."
}
_push_args() {   # the words after `push`
  local w nx=0 del=0 all=0 pos=0 specs="" c m
  _remote=""
  for w in "$@"; do
    [ "$nx" = 1 ] && { nx=0; continue; }
    case "$w" in
      # A redirection is the shell's, not git's: `2>&1` must not read as a refspec.
      '>'|'>>'|'<'|[0-9]'>'|[0-9]'>>'|'&>') nx=1; continue ;;
      *'>'*|*'<'*) continue ;;
    esac
    if [ "$pos" = 0 ]; then
      case "$w" in
        --) pos=1; continue ;;
        --all|--mirror|--branches) all=1; continue ;;
        --delete) del=1; continue ;;
        --repo|--push-option|--receive-pack|--exec) nx=1; continue ;;
        --*) continue ;;
        -?*) c="${w#-}"
             while [ -n "$c" ]; do
               case "$c" in d*) del=1 ;; o) nx=1; break ;; o*) break ;; esac
               c="${c#?}"
             done
             continue ;;
      esac
    fi
    if [ -z "$_remote" ]; then _remote="$w"; else specs="$specs $w"; fi
  done
  if [ "$all" = 1 ]; then
    while IFS= read -r m; do
      m="${m#refs/heads/}"; [ -n "$m" ] || continue
      _add_ref "$m" push; _push_dst "$m" "$(_sha "refs/heads/$m")"
    done <<EOF
$(git -C "$ROOT" for-each-ref --format='%(refname)' refs/heads/ 2>/dev/null)
EOF
  fi
  if [ "$del" = 1 ]; then
    for m in $specs; do _push_del "$m"; done
    return 0
  fi
  for m in $specs; do _push_spec "$m"; done
  if [ -z "$specs" ] && [ "$all" = 0 ]; then
    _gate_cur=1
    _push_switched "git push${_remote:+ $_remote}"
    if [ -n "$_cur" ]; then
      _push_dst "$_cur" "$_head_sha"
      m="$(_mapped_dst "$_cur")"; [ -n "$m" ] && _push_dst "$m" "$_head_sha"
    fi
  fi
}
# A builtin cannot be hidden by an alias; anything else may be one.
_git_builtin=' add am apply bisect blame branch bundle cat-file checkout cherry cherry-pick clean clone commit config describe diff difftool fetch for-each-ref format-patch fsck gc grep help http-push init log ls-files ls-remote ls-tree merge merge-base merge-tree mv notes pull push range-diff rebase reflog remote repack replace reset restore rev-list rev-parse revert rm send-pack shortlog show show-ref sparse-checkout stash status submodule switch symbolic-ref tag update-index update-ref var verify-commit version worktree '
_git_cfg() {     # $1 = the option   $2 = the key=value it sets for one command
  case "$(printf '%s' "$2" | lower)" in
    alias.*) _refuse "git $1 $2 — an alias defined for one command hides what it runs." ;;
    core.hookspath*) _refuse "git $1 $2 — that disables the hooks for this command." ;;
    # An included file is config the guard never reads: an alias, a hooks path
    # or a push map can all arrive through it.
    include.path*|includeif.*) _refuse "git $1 $2 — an included config file can set an alias, the hooks path
    or where a push lands, none of which the guard can read." ;;
    remote.*.push|remote.*.push=*|remote.*.mirror|remote.*.mirror=*|push.default|push.default=*|\
    remote.pushdefault|remote.pushdefault=*|branch.*.merge|branch.*.merge=*|branch.*.remote|\
    branch.*.remote=*|branch.*.pushremote|branch.*.pushremote=*)
      [ "$_human" = 1 ] && _refuse "git $1 $2 — that changes where a push lands, for this one command, so
    the guard cannot tell which remote branch it writes. Name the destination in the
    refspec (git push origin <branch>)." ;;
  esac
}
# Under merge.authority: human, a branch set to track the deploy branch can
# write it with a bare `git push` (push.default=upstream).
_git_branch_up() {
  local w nx=0 up="" br=""
  for w in "$@"; do
    [ "$nx" = 1 ] && { up="$w"; nx=0; continue; }
    case "$w" in
      -u|--set-upstream-to) nx=1 ;;
      --set-upstream-to=*) up="${w#*=}" ;;
      -u?*) up="${w#-u}" ;;
      -*) ;;
      *) [ -n "$br" ] || br="$w" ;;
    esac
  done
  [ -n "$up" ] && [ -n "$_dflt" ] || return 0
  up="${up#refs/remotes/}"; up="${up#refs/heads/}"; up="${up#origin/}"
  [ "$up" = "$_dflt" ] || return 0
  [ "${br:-$_cur}" = "$_dflt" ] && return 0
  _refuse "git branch --set-upstream-to $up — a branch that tracks the deploy branch can
    push onto it with a bare git push, and merge.authority is human. Track the
    branch's own name on the remote (git push -u origin <branch>)."
}
_git_words() {   # $1 = depth; then the words after the git program
  local depth="$1" w sub="" lsub exp skip c nx srf
  local -a nw
  shift
  # git's own options come before the subcommand; some take the next word.
  while [ $# -gt 0 ]; do
    w="$1"
    case "$w" in
      -c|--config-env) _git_cfg "$w" "${2:-}"; shift 2 2>/dev/null || shift; continue ;;
      --config-env=*)  _git_cfg "$w" "${w#--config-env=}"; shift; continue ;;
      -C) _stays "${2:-}" || _elsewhere=1; shift 2 2>/dev/null || shift; continue ;;
      --git-dir|--work-tree) _elsewhere=1; shift 2 2>/dev/null || shift; continue ;;
      --git-dir=*|--work-tree=*) _elsewhere=1; shift; continue ;;
      --namespace|--attr-source|--super-prefix)
        shift 2 2>/dev/null || shift; continue ;;
      -*) shift; continue ;;
    esac
    sub="$w"; shift; break
  done
  [ -n "$sub" ] || return 0
  # `git $(echo push) …`: a subcommand computed when the command runs.
  case "$sub" in *'$'*|*'`'*) _unread "git $sub"; return 0 ;; esac
  # git takes an option abbreviated: `--no-verif`, `--no-v` are --no-verify.
  for w in "$@"; do
    case "$w" in
      --no-v|--no-ve|--no-ver|--no-veri|--no-verif|--no-verify|--no-verify=*)
        _refuse "git $sub $w — that is --no-verify: it skips the secret scan and the verification gate." ;;
    esac
  done
  lsub="$(printf '%s' "$sub" | lower)"   # git-PUSH.exe is git-push.exe on Windows
  case "$_git_builtin" in *" $lsub "*) ;; *)
    if [ "$depth" -lt 5 ]; then
      exp="$(git -C "$ROOT" config --get "alias.$lsub" 2>/dev/null)"
      if [ -n "$exp" ]; then
        case "$exp" in
          '!'*) _scan "$((depth + 1))" "$(glue "${exp#!}")" ;;   # a shell alias is a command
          *)    read -r -a nw <<<"$exp"                         # split into words, as git does
                for w in "$@"; do nw+=("$w"); done
                _git_words "$((depth + 1))" "${nw[@]}" ;;
        esac
        return 0
      fi
    fi ;;
  esac
  case "$lsub" in
    commit)
      [ "$(vantry_cfg strictness standard)" = "strict" ] && _gate_cur=1
      # `-n` is --no-verify, alone or in a cluster (`-anm`), until an option
      # that takes a value consumes the rest (`-mn` is a message "n").
      skip=0
      for w in "$@"; do
        [ "$skip" = 1 ] && { skip=0; continue; }
        case "$w" in
          --) break ;;
          --*) ;;
          -?*) c="${w#-}"
               while [ -n "$c" ]; do
                 case "$c" in
                   n*) _refuse "git commit $w — -n is --no-verify: it skips the secret scan and the
    commit-message check."; break ;;
                   [mFcCt]) skip=1; break ;;
                   [mFcCtuS]*) break ;;
                 esac
                 c="${c#?}"
               done ;;
        esac
      done ;;
    push) _saw_push=1; _push_args "$@" ;;
    # The plumbing under push sends refs without ever running pre-push.
    send-pack|http-push|remote-*)
      _refuse "git $sub — it publishes refs without running .githooks/pre-push, so no
    receipt is checked. Use git push: it is judged branch by branch." ;;
    config) _git_config "$@" ;;
    branch) if [ "$_human" = 1 ]; then _git_branch_up "$@"; fi ;;
    # The current branch is read once, before the command runs. After a switch
    # in the same command, a push that names no branch publishes another one
    # (security review, 19 Nov 2026). `checkout [<tree>] -- <file>` restores
    # files; `checkout main --`, with nothing after the `--`, is a switch.
    # A redirect after the `--` (`2>/dev/null`, `> out`) names no file.
    checkout)
      c=0 nx=0
      for w in "$@"; do
        [ "$nx" = 1 ] && { nx=0; continue; }
        if _is_redir "$w"; then nx="$_rd_bare"; continue; fi
        [ "$c" = 1 ] && { c=2; break; }; [ "$w" = "--" ] && c=1
      done
      [ "$c" = 2 ] || _switched=1 ;;
    switch|worktree) _switched=1 ;;
    # `git rebase <upstream> <branch>` checks <branch> out first, and so does
    # `--root <branch>`.
    rebase)
      c=0 skip=0 nx=0
      for w in "$@"; do
        [ "$nx" = 1 ] && { nx=0; continue; }
        case "$w" in
          --onto|-s|--strategy|-X|--strategy-option|-x|--exec) nx=1 ;;
          --root) skip=1 ;;
          -*) ;;
          *) c=$((c + 1)) ;;
        esac
      done
      { [ "$c" -ge 2 ] || { [ "$skip" = 1 ] && [ "$c" -ge 1 ]; }; } && _switched=1 ;;
    remote) if [ "$_human" = 1 ]; then _git_remote "$@"; fi ;;
    symbolic-ref)
      # `git symbolic-ref HEAD refs/heads/<b>` moves HEAD to another branch: a switch.
      c=0 nx=0 srf=""
      for w in "$@"; do
        [ "$nx" = 1 ] && { nx=0; continue; }
        if _is_redir "$w"; then nx="$_rd_bare"; continue; fi
        case "$w" in
          -m) nx=1; continue ;;
          -*) continue ;;
        esac
        c=$((c + 1)); [ "$c" = 1 ] && srf="$w"
      done
      [ "$c" -ge 2 ] && [ "$srf" = HEAD ] && _switched=1
      if [ "$_human" = 1 ]; then
        c=0
        for w in "$@"; do case "$w" in -d|--delete) c=2 ;; -*) ;; *) c=$((c + 1)) ;; esac; done
        case " $* " in *" refs/remotes/"*"/HEAD "*)
          [ "$c" -ge 2 ] && _refuse "git symbolic-ref $* — the remote's HEAD names the branch that deploys.
    merge.authority is human: a person changes it." ;;
        esac
      fi ;;
  esac
  return 0
}
# Under merge.authority: human. The remote's HEAD names the branch that deploys
# (`set-head <remote> -a` reads it from the remote and passes), and a push
# mirror publishes every ref, the deploy branch included.
_git_remote() {
  local w
  case "${1:-}" in
    set-head)
      for w in "$@"; do case "$w" in -a|--auto) return 0 ;; esac; done
      _refuse "git remote $* — the remote's HEAD names the branch that deploys.
    merge.authority is human: a person changes it (git remote set-head <remote> -a
    reads it from the remote)." ;;
    add)
      for w in "$@"; do
        case "$w" in --mirror|--mirror=*)
          _refuse "git remote $* — a push mirror publishes every ref, the deploy branch
    included. merge.authority is human." ;;
        esac
      done ;;
  esac
  return 0
}
# An alias is read when the command runs. One written by an agent — in this
# command (`git config alias.p push && git p origin x`) or for a later one — can
# hide a push or a merge from that reading, so an agent never writes one. Reading,
# listing and removing aliases pass.
_git_config() {
  local w lw nx=0 ak=0 pk=0 rd=0 np=0 first=""
  for w in "$@"; do
    [ "$nx" = 1 ] && { nx=0; continue; }
    lw="$(printf '%s' "$w" | lower)"
    case "$lw" in
      -f|--file|--blob|--type|--default|--comment|--value|--url) nx=1 ;;
      --get|--get-all|--get-regexp|--get-urlmatch|-l|--list|--unset|--unset-all|--remove-section) rd=1 ;;
      -*) ;;
      *) np=$((np + 1)); [ -n "$first" ] || first="$lw"
         case "$lw" in
           alias|alias.*|include.path|includeif.*) ak=1 ;;
           remote.*.push|remote.*.mirror|push.default|remote.pushdefault|branch.*.merge|branch.*.remote|branch.*.pushremote) pk=1 ;;
         esac ;;
    esac
  done
  [ "$rd" = 0 ] || return 0
  case "$first" in get|list|unset|remove-section) return 0 ;; esac
  [ "$np" -ge 2 ] || return 0              # `git config alias.x` reads it
  [ "$ak" = 1 ] && _refuse "git config $* — that writes a git alias or a config include. The guard
    reads an alias when a command runs, so one an agent writes, directly or in an
    included file, can hide a push or a merge from it. Ask a person to define it
    outside the session."
  # The same for where a push lands: a refspec or upstream written now redirects
  # a later bare `git push` onto the deploy branch.
  [ "$pk" = 1 ] && [ "$_human" = 1 ] && _refuse "git config $* — that changes where a later push lands. Under
    merge.authority: human the guard must be able to tell when a push writes the
    deploy branch. Name the destination in the refspec instead."
  return 0
}
_gh_pr_create() {
  local w nx=""
  for w in "$@"; do
    case "$nx" in H) _pr_head="$w"; nx=""; continue ;; B) _pr_base="$w"; nx=""; continue ;; esac
    case "$w" in
      -H|--head) nx=H ;;  --head=*) _pr_head="${w#--head=}" ;;  -H*) _pr_head="${w#-H}" ;;
      -B|--base) nx=B ;;  --base=*) _pr_base="${w#--base=}" ;;  -B*) _pr_base="${w#-B}" ;;
      -f|--fill|--fill-first|--fill-verbose) _pr_fill=1 ;;
    esac
  done
  _pr_head="${_pr_head#=}"; _pr_base="${_pr_base#=}"
  _gh_pr_body "$@"
}
# Whether an inline body is in the text: only the body's own word is read. A
# `$` anywhere else (`--title "costs $5"`) left every body unjudged (security
# review, 19 Nov 2026). A body the shell computes, or one that cannot be cut
# out of the command cleanly, is left to CI.
_bl_re='(^|[[:space:]])(--body|-b)(=|[[:space:]]+)(.*)$'
_body_literal() {
  local r q b
  [[ $cmd =~ $_bl_re ]] || return 1
  r="${BASH_REMATCH[4]}"
  case "$r" in
    \"*) q='"' ;;
    \'*) q="'" ;;
    *) b="${r%%[[:space:]]*}"
       case "$b" in *'$'*|*'`'*|*\\*|*\"*|*\'*) return 1 ;; esac
       return 0 ;;
  esac
  r="${r#?}"
  case "$r" in *"$q"*) ;; *) return 1 ;; esac
  b="${r%%"$q"*}"; r="${r#*"$q"}"
  case "$r" in ''|[[:space:]]*) ;; *) return 1 ;; esac    # `'a'"$X"` is one word
  [ "$q" = "'" ] && return 0
  case "$b" in *'$'*|*'`'*|*\\*) return 1 ;; esac
  return 0
}
# Where a PR's body comes from. An inline body is read from the raw command:
# the word view blanks a quoted span holding a space.
_gh_pr_body() {
  local w nx=0
  for w in "$@"; do
    [ "$nx" = 1 ] && { _pr_bfile="$w"; nx=0; continue; }
    case "$w" in
      -b|--body|--body=*) _pr_bodyset=1 ;;
      -F|--body-file) nx=1 ;;  --body-file=*) _pr_bfile="${w#--body-file=}" ;;
      -w|--web|-T|--template|--template=*) _pr_web=1 ;;
    esac
  done
}
_gh_api() {      # the REST and GraphQL routes to the same two actions
  local w nx="" seen=0 method="" fields=0 ep="" hd="" bs="" df=0
  for w in "$@"; do
    case "$nx" in
      X) method="$w"; nx=""; continue ;;
      F) fields=1; case "$w" in head=*) hd="${w#head=}" ;; base=*) bs="${w#base=}" ;; default_branch=*) df=1 ;; esac; nx=""; continue ;;
      V) nx=""; continue ;;
    esac
    case "$w" in
      -X|--method) nx=X ;;  --method=*) method="${w#--method=}" ;;  -X*) method="${w#-X}" ;;
      -f|-F|--field|--raw-field) nx=F ;;
      --field=*|--raw-field=*|-f?*|-F?*)
        fields=1; w="${w#--field=}"; w="${w#--raw-field=}"; w="${w#-[fF]}"
        case "$w" in head=*) hd="${w#head=}" ;; base=*) bs="${w#base=}" ;; default_branch=*) df=1 ;; esac ;;
      --input) fields=1; nx=V ;;  --input=*) fields=1 ;;
      -H|--header|-q|--jq|-t|--template|--cache|--hostname|-p|--preview|-R|--repo) nx=V ;;
      -*) ;;
      *) if [ "$seen" = 0 ]; then seen=1; elif [ -z "$ep" ]; then ep="$w"; fi ;;
    esac
  done
  method="$(printf '%s' "${method#=}" | lower)"
  if [ -z "$method" ]; then
    if [ "$fields" = 1 ]; then method="post"; else method="get"; fi
  fi
  ep="$(printf '%s' "$ep" | lower)"; ep="${ep%%\?*}"
  # An absolute URL is the same route: https://api.github.com/repos/…, or
  # https://<enterprise host>/api/v3/repos/… .
  case "$ep" in *://*) ep="${ep#*://}"; ep="${ep#*/}" ;; esac
  ep="${ep#/}"; ep="${ep#api/v3/}"; ep="${ep%/}"
  case "$ep" in
    graphql) _gql ;;
    repos/*/*/pulls) [ "$method" = post ] && { _saw_pr=1; _pr_head="$hd"; _pr_base="$bs"; } ;;
    repos/*/*/pulls/*/merge) [ "$method" = put ] && _merge=1 ;;
    repos/*/*/merges) [ "$method" = post ] && _merge=1 ;;     # merge a branch into another
    repos/*/*/pulls/*/update-branch|repos/*/*/merge-upstream)
      [ "$method" = get ] || _api_write "gh api $ep" ;;
    repos/*/*/git/refs|repos/*/*/git/refs/*)
      case "$method" in post|patch|put|delete) _api_write "gh api -X $method $ep" ;; esac ;;
    repos/*/*/contents/*)
      case "$method" in put|delete) _api_write "gh api -X $method $ep" ;; esac ;;
    repos/*/*/branches/*/rename)
      [ "$method" = get ] || _api_write "gh api $ep" ;;
    repos/*/*)   # `*` crosses `/`: any other repository route that sets default_branch
      [ "$df" = 1 ] && [ "$method" != get ] && _deploy_branch "gh api … default_branch" ;;
  esac
}
# Renaming the deploy branch, or pointing the repository at another one, changes
# what deploys without a merge (security review, 18 Nov 2026).
_deploy_branch() {
  [ "$_human" = 1 ] || return 0
  _refuse "$1 — that changes which branch deploys. merge.authority is human: a person
    changes the deploy branch, not a session."
}
_gql() {         # a GraphQL call: the mutation names say what it does
  case "$lraw_q" in *mergepullrequest*|*enablepullrequestautomerge*|*mergebranch*|*enqueuepullrequest*) _merge=1 ;; esac
  case "$lraw_q" in *createpullrequest*) _saw_pr=1 ;; esac
  case "$lraw_q" in *createcommitonbranch*|*updateref*|*createref*|*deleteref*|*updatepullrequestbranch*)
    _api_write "a GraphQL ref or commit mutation" ;; esac
}
_gh_known=' agent-task alias api attestation auth browse cache co codespace completion config copilot extension gist gpg-key help issue label org pr preview project release repo ruleset run search secret ssh-key status variable workflow '
_gh_words() {    # $1 = depth; then the words after the gh program
  local depth="$1" w nx=0 a="" b="" exp done_a=0
  local -a nw
  shift
  for w in "$@"; do
    [ "$nx" = 1 ] && { nx=0; continue; }
    case "$w" in
      -R|--repo|--hostname) nx=1 ;;
      -*) ;;
      *) if [ -z "$a" ]; then a="$(printf '%s' "$w" | lower)"
         elif [ -z "$b" ]; then b="$(printf '%s' "$w" | lower)"; fi ;;
    esac
  done
  case "$a" in
    pr) case "$b" in
          create|new) _saw_pr=1; _gh_pr_create "$@" ;;
          edit) _saw_pr_edit=1; _gh_pr_body "$@" ;;
          merge) _merge=1 ;;
          update-branch) _api_write "gh pr update-branch" ;;
          *'$'*|*'`'*) _unread "gh pr $b" ;;      # `gh pr $(printf merge)`
        esac ;;
    api) _gh_api "$@" ;;
    repo) if [ "$b" = edit ]; then
            for w in "$@"; do
              case "$w" in --default-branch|--default-branch=*) _deploy_branch "gh repo edit $w" ;; esac
            done
          fi ;;
    # `gh alias set pm 'pr merge' && gh pm 1`: the alias list the guard reads
    # below does not hold it yet. An agent never writes one; see _git_config.
    alias) case "$b" in set|import)
             _refuse "gh alias $b — that writes a gh alias. The guard reads an alias when a
    command runs, so one an agent writes can hide a merge or a pull request from
    it. Ask a person to define the alias outside the session." ;; esac ;;
    *'$'*|*'`'*) _unread "gh $a" ;;
    ""|*[!a-z0-9_-]*) ;;
    *)
      case "$_gh_known" in *" $a "*) return 0 ;; esac
      # `gh alias set pm 'pr merge'`, then `gh pm`: read what the alias runs.
      [ "$depth" -lt 5 ] && command -v gh >/dev/null 2>&1 || return 0
      exp="$(gh alias list 2>/dev/null | sed -n "s/^$a:[[:space:]]*//p" | head -n 1)"
      [ -n "$exp" ] || return 0
      case "$exp" in
        '!'*) _scan "$((depth + 1))" "$(glue "${exp#!}")" ;;
        *)    read -r -a nw <<<"$exp"                         # split into words, as gh does
              for w in "$@"; do
                if [ "$done_a" = 0 ] && [ "$(printf '%s' "$w" | lower)" = "$a" ]; then done_a=1; continue; fi
                nw+=("$w")
              done
              _gh_words "$((depth + 1))" "${nw[@]}" ;;
      esac ;;
  esac
}
_http_api() {    # curl & co. straight at the GitHub API
  # Read without quotes, as the shell passes it: `pu''lls` is `pulls`.
  case "$lraw_q" in *api.github.com*|*/api/v3/*) ;; *) return 0 ;; esac
  case "$lraw_q" in *"/pulls/"*"/merge"*) _merge=1 ;; esac
  printf '%s\n' "$lraw_q" | LC_ALL=C grep -qE '/repos/[^/[:space:]]+/[^/[:space:]]+/merges([^a-z0-9_-]|$)' && _merge=1
  case "$lraw_q" in *graphql*) _gql ;; esac
  case "$lraw_q" in */update-branch*|*/merge-upstream*) _api_write "a request to the GitHub branch-update API" ;; esac
  # Reading refs and contents is common; writing them is the publication. Short
  # options keep their case here: curl's -D dumps headers, -d sends data.
  if printf '%s\n' "$lraw_q" | LC_ALL=C grep -qE '/git/refs|/contents/|/branches/[^/[:space:]]+/rename' &&
     printf '%s\n' "$gcase_q" | LC_ALL=C grep -qE "$_http_write"; then
    _api_write "a write request to the GitHub refs, contents or branch-rename API"
  fi
  case "$lraw_q" in *default_branch*)
    printf '%s\n' "$gcase_q" | LC_ALL=C grep -qE "$_http_write" && _deploy_branch "a write of default_branch to the GitHub API" ;;
  esac
  if printf '%s\n' "$lraw_q" | LC_ALL=C grep -qE '/pulls([^/a-z0-9_]|$)' &&
     printf '%s\n' "$lraw_q" | LC_ALL=C grep -qE '(^|[[:space:]])(-d|--data[a-z-]*|-x[[:space:]]*post|--request[[:space:]=]*post|-method[[:space:]]+post|-body)([[:space:]=]|$)'; then
    _saw_pr=1
  fi
}
_scan() {        # $1 = depth   $2 = command text, glued
  local depth="$1" seg i n w at doc rest e enx j k o
  local -a T
  [ "$depth" -le 5 ] || return 0
  while IFS= read -r seg; do
    [ -n "${seg//[[:space:]]/}" ] || continue
    read -r -a T <<<"$seg"; n=${#T[@]}; i=0; at=1
    [ "$depth" = 0 ] && _elsewhere=0     # `git -C` holds for its own command only
    # A command that only names or prints another (`man git-send-pack`,
    # `echo git-push`) runs nothing: its words are text.
    doc=0
    for w in "${T[@]}"; do
      case "$w" in *=*|'{'|'}'|if|then|elif|else|do|while|until|'!') continue ;; esac
      w="$(printf '%s' "${w##*/}" | lower)"; w="${w%.exe}"
      case "$w" in
        man|help|info|whatis|apropos|which|type|echo|printf|whereis|where|get-help|cat|ls|grep|rg|less|more|head|tail) doc=1 ;;
      esac
      break
    done
    while [ "$i" -lt "$n" ]; do
      # A command word computed when the command runs — `$(echo gh) pr merge`,
      # `"$(command -v gh)" pr merge`, `$G push` — may be gh or git. Where the
      # words after it are a merge, a PR or a publication, it is not read as
      # harmless (security review, 18 Nov 2026).
      if [ "$at" = 1 ]; then
        case "${T[$i]}" in
          '$'*|[\"\']'$'*|'`'*|[\"\']'`'*)
            rest=" $(printf '%s ' "${T[@]:$((i + 1))}" | lower)"
            case "$rest" in
              *" pr merge "*|*" pr create "*|*" pr new "*|*" api "*|*" push "*|*" send-pack "*|*" http-push "*)
                _unread "${T[$i]}$rest"; break ;;
            esac ;;
        esac
      fi
      case "${T[$i]##*/}" in
        # A `cd` that leaves this working tree: a later push publishes another
        # repository's branch (security review, 19 Nov 2026).
        [Cc][Dd]|[Pp][Uu][Ss][Hh][Dd]|[Cc][Hh][Dd][Ii][Rr]|[Ss][Ee][Tt]-[Ll][Oo][Cc][Aa][Tt][Ii][Oo][Nn]|[Pp][Uu][Ss][Hh]-[Ll][Oo][Cc][Aa][Tt][Ii][Oo][Nn]|[Ss][Ll])
          if [ "$at" = 1 ]; then
            w="${T[$((i + 1))]:-}"
            case "$w" in -[Pp][Aa][Tt][Hh]|-[Ll][Ii][Tt][Ee][Rr][Aa][Ll][Pp][Aa][Tt][Hh]) w="${T[$((i + 2))]:-}" ;; esac
            _stays "$w" || _switched=1
            break
          fi ;;
        [Pp][Oo][Pp][Dd]|[Pp][Oo][Pp]-[Ll][Oo][Cc][Aa][Tt][Ii][Oo][Nn])
          [ "$at" = 1 ] && { _switched=1; break; } ;;
        [Gg][Ii][Tt]|*[Gg][Ii][Tt].[Ee][Xx][Ee]) _git_words "$depth" "${T[@]:$((i + 1))}"; break ;;
        [Gg][Hh]|*[Gg][Hh].[Ee][Xx][Ee])         _gh_words "$depth" "${T[@]:$((i + 1))}"; break ;;
        [Cc][Uu][Rr][Ll]|[Cc][Uu][Rr][Ll].[Ee][Xx][Ee]|[Ww][Gg][Ee][Tt]|[Hh][Tt][Tt][Pp]|[Hh][Tt][Tt][Pp][Ss]|[Xx][Hh]|[Xx][Hh][Ss]|[Ii][Rr][Mm]|[Ii][Ww][Rr]|[Ii][Nn][Vv][Oo][Kk][Ee]-[Rr][Ee][Ss][Tt][Mm][Ee][Tt][Hh][Oo][Dd]|[Ii][Nn][Vv][Oo][Kk][Ee]-[Ww][Ee][Bb][Rr][Ee][Qq][Uu][Ee][Ss][Tt])
          _http_api; break ;;
        # The dashed program git itself runs (libexec/git-core/git-push,
        # git-send-pack.exe) is the subcommand: read it as one, where it
        # stands as the command — `man git-send-pack` only names it. Behind a
        # wrapper that takes arguments (`timeout 60`, `nice -n 5`, `xargs`,
        # `stdbuf -o0`) the publishing ones are still read, unless the command
        # only names or prints them.
        [Gg][Ii][Tt]-?*)
          w="${T[$i]##*/}"; w="${w#????}"; w="${w%.[Ee][Xx][Ee]}"
          if [ "$at" = 1 ]; then
            _git_words "$depth" "$w" "${T[@]:$((i + 1))}"; break
          fi
          if [ "$doc" = 0 ]; then
            case "$(printf '%s' "$w" | lower)" in push|send-pack|http-push|remote-*)
              _git_words "$depth" "$w" "${T[@]:$((i + 1))}"; break ;;
            esac
          fi ;;
      esac
      # `env -C <dir>` / `env --chdir[=]<dir>` runs its command in <dir>, as a
      # cd — wherever it stands among env's options: `env -u FOO -C ../x`,
      # `env -vC ../x`, `env --debug --chd=../x` (security review, 19 Nov 2026).
      case "${T[$i]##*/}" in
        [Ee][Nn][Vv]|[Ee][Nn][Vv].[Ee][Xx][Ee])
          if [ "$at" = 1 ]; then
            w="" enx="" j=$((i + 1))
            while [ "$j" -lt "$n" ]; do
              e="${T[$j]}"; j=$((j + 1))
              case "$enx" in C) w="$e"; break ;; s) enx=""; continue ;; esac
              case "$e" in
                --|-) break ;;
                --?*=*) _abbr "${e%%=*}" --chdir && { w="${e#*=}"; break; } ;;
                --?*) _abbr "$e" --chdir && enx=C
                      for o in --unset --split-string --argv0; do _abbr "$e" "$o" && enx=s; done ;;
                -?*)  k=1      # a cluster: the first letter that takes a value ends it
                      while [ "$k" -lt "${#e}" ]; do
                        case "${e:$k:1}" in
                          C) w="${e:$((k + 1))}"; [ -n "$w" ] || enx=C; break ;;
                          u|S|a) [ -n "${e:$((k + 1))}" ] || enx=s; break ;;
                        esac
                        k=$((k + 1))
                      done
                      [ -n "$w" ] && break ;;
                *=*) ;;
                *) break ;;
              esac
            done
            [ -n "$w" ] && { _stays "$w" || _switched=1; }
          fi ;;
      esac
      # Still at the command's position behind an assignment, a prefix, or a
      # shell keyword that opens a command (`{ cd ..; git push; }`, `if cd ..;
      # then git push; fi`, `function f { cd ..; }; f; git push`). `{` opens
      # a command again after a function's name.
      case "${T[$i]}" in '{') at=1 ;; *=*|-*|sudo|env|exec|command|nohup|time|nice|builtin|function|'!'|'}'|if|then|elif|else|do|while|until) ;; *) at=0 ;; esac
      i=$((i + 1))
    done
  done <<EOF
$(printf '%s\n' "$2" | tr ';&|()\140' '\n\n\n\n\n\n')
EOF
}

# A command word computed when it runs (`$G push`, `"$(command -v gh)" pr
# merge`) names no git or gh the reading below could find, and glue() blanks a
# quoted span holding a space. Read on the raw text: where the words after it
# are a merge, a PR or a publication, it is refused as unreadable (security
# review, 18 Nov 2026).
while IFS= read -r _seg; do
  printf '%s\n' "$_seg" | LC_ALL=C grep -qE '^[[:space:]]*(([a-z_][a-z0-9_]*=[^[:space:]]*|sudo|env|exec|command|nohup|time|builtin)[[:space:]]+)*"?(\$[^[:space:]]|`)[^[:space:]]*.*[[:space:]](pr[[:space:]]+(merge|create|new)|api|push|send-pack|http-push)([[:space:]]|$)' \
    && { _unread "${_seg#"${_seg%%[![:space:]]*}"}"; break; }
done <<EOF
$(printf '%s\n' "$lraw" | tr ';&|' '\n\n\n')
EOF
# xargs and parallel append words read from stdin: `echo feat:main | xargs git
# push origin` pushes a refspec that is nowhere in the text (security review,
# 19 Nov 2026).
while IFS= read -r _seg; do
  printf '%s\n' "$_seg" | LC_ALL=C grep -qE '(^|[[:space:]/])(xargs|parallel)(\.exe)?[[:space:]](.*[[:space:]/])?(git(\.exe)?[[:space:]]+([^[:space:]]+[[:space:]]+)*(push|send-pack|http-push)|git-(push|send-pack|http-push)|gh(\.exe)?[[:space:]]+([^[:space:]]+[[:space:]]+)*(pr[[:space:]]+(merge|create|new)|api))([[:space:]]|$)' \
    && { _unread "${_seg#"${_seg%%[![:space:]]*}"} (its words come from stdin)"; break; }
done <<EOF
$(printf '%s\n' "$lraw" | tr ';&|' '\n\n\n')
EOF
# A config file named for one command is config the guard never reads.
printf '%s\n' "$lraw" | LC_ALL=C grep -qE '(^|[[:space:];&|(])(export[[:space:]]+)?git_config_(global|system)=' \
  && _refuse "GIT_CONFIG_GLOBAL / GIT_CONFIG_SYSTEM — a config file named for one command can set
    an alias, the hooks path or where a push lands, none of which the guard reads."
printf '%s\n' "$gcmd" | LC_ALL=C grep -qE 'git_config_(parameters|key_[0-9]+)=[^[:space:]]*(include\.path|includeif\.)' \
  && _refuse "GIT_CONFIG_* include — an included config file is config the guard never reads."
# GIT_DIR / GIT_WORK_TREE point git at another repository, as --git-dir does.
printf '%s\n' "$lraw" | LC_ALL=C grep -qE '(^|[[:space:];&|(])(export[[:space:]]+|\$env:)?git_(dir|work_tree)[[:space:]]*=' \
  && _moved=1
case "$gcmd
$lraw" in *git*|*gh*|*/api/v3/*)   # api.github.com contains both
  _cur="$(git -C "$ROOT" symbolic-ref -q --short HEAD 2>/dev/null || true)"
  _head_sha="$(git -C "$ROOT" rev-parse -q --verify HEAD 2>/dev/null || true)"
  _dflt="$(git -C "$ROOT" symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  _dflt="${_dflt#origin/}"
  # No origin/HEAD (a clone made with --no-checkout, a remote added by hand):
  # an existing origin/main or origin/master is still the deploy branch, not
  # "none". With neither (no remote yet, or the first push of a new repository)
  # there is nothing published to protect, and pre-push, CI and branch
  # protection judge what follows.
  if [ -z "$_dflt" ]; then
    for _b in main master; do
      git -C "$ROOT" rev-parse -q --verify "refs/remotes/origin/$_b" >/dev/null 2>&1 && { _dflt="$_b"; break; }
    done
  fi
  [ "$(vantry_cfg merge.authority human)" = "human" ] && _human=1
  # An alias set through the environment for one command, as -c would set it.
  printf '%s\n' "$gcmd" | LC_ALL=C grep -qE 'git_config_(parameters|key_[0-9]+)=[^[:space:]]*alias\.' \
    && _refuse "GIT_CONFIG_* alias.… — an alias defined for one command hides what it runs."
  # The same for where a push lands, as _git_cfg reads it for -c.
  [ "$_human" = 1 ] && printf '%s\n' "$gcmd" | LC_ALL=C grep -qE 'git_config_(parameters|key_[0-9]+)=[^[:space:]]*(remote\.[^[:space:]]*\.(push|mirror)|push\.default|remote\.pushdefault|branch\.[^[:space:]]*\.(merge|remote|pushremote))' \
    && _refuse "GIT_CONFIG_* — a refspec or upstream set for one command changes where a push
    lands. Name the destination in the refspec instead."
  # The text the parser reads: continuation lines joined, as the shell joins
  # them. PowerShell continues a line with a backtick and separates a path with
  # a backslash, so there a backslash is a path, never an escape.
  if [ "$_tool" = "PowerShell" ]; then
    _cj="$(printf '%s\n' "$cmd" | tr '\\' '/' | awk '{ if (sub(/`$/, "")) printf "%s", $0; else print }')"
  else
    _cj="$(printf '%s\n' "$cmd" | awk '{ if (sub(/\\$/, "")) printf "%s", $0; else print }')"
  fi
  _pcase="$(glue "$_cj")"
  [ "$_wrap" = 1 ] && _pcase="$_pcase
$(printf '%s\n' "$_cj" | tr -d "\"'\\\\")"
  set -f
  _scan 0 "$_pcase"
  # The scan splits at ( ) and backticks, to find a command inside $(…), and
  # that also cuts the word around it: `git push origin $(x):refs/heads/main`
  # left a refspec `$` and lost where it lands. Read the command a second time
  # with each substitution as one opaque word, `$_`. Both readings add up.
  _psub="$(printf '%s\n' "$_pcase" | sed -e ':a' -e 's/\$([^()]*)/$_/g' -e 'ta' -e 's/`[^`]*`/$_/g')"
  _switched=0   # the second reading starts where the command does
  [ "$_psub" = "$_pcase" ] || _scan 0 "$_psub"
  set +f ;;
esac
# The words alone, where the parser found no command it could read.
if [ "$_saw_push" = 0 ] && [ "$_saw_pr" = 0 ]; then
  case "$scmd" in *"git push"*|*"gh pr create"*) _gate_cur=1 ;; esac
fi
case "$scmd" in *"git commit"*) [ "$(vantry_cfg strictness standard)" = "strict" ] && _gate_cur=1 ;; esac
# A pull request is judged by the branch it is opened FROM.
if [ "$_saw_pr" = 1 ]; then
  _ph="${_pr_head#*:}"                        # owner:branch → branch
  case "$_ph" in
    ""|"$_cur"|*'$'*|*'`'*) _gate_cur=1 ;;
    *) if _is_branch "$_ph"; then _add_ref "$_ph" pr
       else _refuse "a pull request from '$_ph' — there is no branch of that name here, so no
    receipt can vouch for it. Check it out here, verify it, then open the PR."; fi ;;
  esac
fi

_curout="" _blocked=""
if [ "$_gate_cur" = 1 ]; then
  _curout="$("$ROOT/scripts/verify.sh" --gate --pre-commit 2>&1)"; rc=$?
  [ "$rc" -ge 2 ] || _curout=""
fi
set -f
for b in $_gate_refs; do
  out="$("$ROOT/scripts/verify.sh" --gate --pre-push --ref "$b" 2>&1)"; rc=$?
  [ "$rc" -ge 2 ] || continue
  why="$(printf '%s\n' "$out" | sed -n 's/^[[:space:]]*reason[[:space:]]*:[[:space:]]*//p' | head -n 1)"
  [ -n "$why" ] || why="$(printf '%s\n' "$out" | sed '/^[[:space:]]*$/d' | head -n 1)"
  _blocked="$_blocked
  · $b — $why"
  # Receipts are kept per working tree. Say where this branch can be verified.
  _wt="$(git -C "$ROOT" worktree list --porcelain 2>/dev/null \
         | awk -v want="branch refs/heads/$b" '/^worktree /{ w = substr($0, 10) } $0 == want { print w; exit }')"
  [ -n "$_wt" ] && [ "$_wt" != "$ROOT" ] && _blocked="$_blocked
      it is checked out at $_wt: verify it there, and push it from there."
done
set +f
if [ -n "$_curout$_blocked$_refused" ]; then
  {
    if [ -n "$_curout" ]; then
      printf '%s\n' "$_curout"
      echo "  (blocked before \`${cmd%% *} ...\` — verify first)"
      echo "  (the guard cannot tell which repository a command lands in, so it judges every one as this project's)"
    fi
    if [ -n "$_blocked" ]; then
      printf '\nDENIED — this command publishes branches that are not verified as they stand:%s\n' "$_blocked"
      echo "  Each branch is judged by its OWN receipt, exactly as .githooks/pre-push will"
      echo "  judge it. Verify each one (scripts/verify.sh on that branch), then retry."
    fi
    [ -n "$_refused" ] && printf '\nDENIED —%s\n' "$_refused"
  } >&2
  vantry_log "guard.deny" "unverified: $cmd"
  exit 2
fi

# --- 3b. a PR is opened on the tree CI will test -------------------------------
# CI on a pull request builds the MERGE of the branch into its base, not the
# branch. When the base has moved since the branch was verified, that merge is a
# tree nobody ran: in one adopting repository, batches verified one by one and
# then merged together failed 58 unit tests in CI, on conflicts no branch had on
# its own (a mock missing a method, i18n keys, test configuration). So before a
# PR opens, the merge CI will build must BE the verified tree: either the branch
# already contains its base, or merging the base changes nothing. The branch is
# the PR's head, as section 3 read it — an explicit --head used to skip this
# check entirely. Anything the guard cannot judge (no remote, a base it cannot
# resolve, a git too old for merge-tree --write-tree) passes, as everywhere above.
if [ "$_saw_pr" = 1 ]; then
  _base="$_pr_base" _bad_base=0
  if [ -n "$_base" ]; then
    # The base reaches `git fetch` as an argument: a value that reads as an
    # option (`--base --prune`) or is not a branch name is never handed to it.
    case "$_base" in -*|*'$'*|*'`'*) _bad_base=1 ;; esac
    [ "$_bad_base" = 0 ] && ! git -C "$ROOT" check-ref-format --branch "$_base" >/dev/null 2>&1 && _bad_base=1
    [ "$_bad_base" = 1 ] && _base=""
  else
    _base="$_dflt"
    [ -n "$_base" ] || _base="$(vantry_cfg merge.base main)"
  fi
  _hr="HEAD" _hn="this branch"
  _ph="${_pr_head#*:}"
  if [ -n "$_ph" ] && [ "$_ph" != "$_cur" ] && _is_branch "$_ph"; then
    _hr="refs/heads/$_ph" _hn="$_ph"
  fi
  if [ -n "$_base" ] && git -C "$ROOT" remote get-url origin >/dev/null 2>&1; then
    # Judge the base as it is NOW on the remote, not as it was last fetched.
    if command -v timeout >/dev/null 2>&1; then
      GIT_TERMINAL_PROMPT=0 timeout 30 git -C "$ROOT" fetch -q origin --end-of-options "$_base" >/dev/null 2>&1
    else
      GIT_TERMINAL_PROMPT=0 git -C "$ROOT" fetch -q origin --end-of-options "$_base" >/dev/null 2>&1
    fi
    _up="refs/remotes/origin/$_base"
    if git -C "$ROOT" rev-parse -q --verify "$_up^{commit}" >/dev/null 2>&1 \
       && ! git -C "$ROOT" merge-base --is-ancestor "$_up" "$_hr" 2>/dev/null; then
      _mt="$(git -C "$ROOT" merge-tree --write-tree "$_up" "$_hr" 2>/dev/null)"; _mrc=$?
      _ht="$(git -C "$ROOT" rev-parse -q --verify "$_hr^{tree}" 2>/dev/null)"
      if [ "$_mrc" -eq 0 ] && [ "$(printf '%s\n' "$_mt" | head -n 1)" = "$_ht" ]; then
        :   # the base only holds what this branch already has: CI tests this tree
      elif [ "$_mrc" -le 1 ]; then
        _why="merging it changes the tree"; [ "$_mrc" -eq 1 ] && _why="merging it CONFLICTS"
        deny "DENIED — origin/$_base has moved since $_hn forked, and $_why.
  CI on a pull request tests the MERGE of the branch into $_base, not the
  branch itself, so it would be proving a tree nobody verified. Bring the base
  in, verify what CI will actually build, then open the PR (on $_hn):
    git merge origin/$_base
    scripts/verify.sh" "pr behind base: $_base: $cmd"
      fi
    fi
  fi
fi

# --- 4. merge authority ------------------------------------------------------
# Read as section 3 read it: `gh pr merge`, `gh api -X PUT …/pulls/N/merge`, a
# GraphQL mergePullRequest, an alias of any of these, or curl at the same route.
# It is judged before section 5 reads any file the command names: a refusal
# must never wait on a file (security review, 19 Nov 2026).
case "$scmd" in *"gh pr merge"*) _merge=1 ;; esac
if [ "$_merge" = 1 ] && [ "$(vantry_cfg merge.authority human)" = "human" ]; then
  deny "DENIED — vantry.yml says merge.authority: human.
  Report that the PR is ready and let a person merge it. To let agents merge,
  a human changes merge.authority to 'agent' in vantry.yml." "merge: $cmd"
fi

# --- 5. a PR opens only when its own CI can pass ------------------------------
# A pull request whose CI fails sends its author back to the start. In one
# adopting repository every PR failed in CI and was redone; this kit's own PR
# then failed two checks that read nothing but the branch: it was opened before
# its security verdict, with its evidence under another heading (19 Nov 2026).
# Both are asked here, before CI is paid for, exactly as CI will ask them.
_ev_filled() {   # $1 = a PR body → 0 when its Verification evidence section holds something
  printf '%s\n' "$1" | awk '/^##[[:space:]]*Verification evidence/{f=1;next} /^##[[:space:]]/{f=0} f' \
    | awk '/<!--/{c=1} !c{print} /-->/{c=0}' \
    | LC_ALL=C grep -vE '^[[:space:]]*_.*_[[:space:]]*$' | LC_ALL=C grep -q '[^[:space:]]'
}
if { [ "$_saw_pr" = 1 ] || [ "$_saw_pr_edit" = 1 ]; } && [ "$_pr_web" = 0 ] \
   && [ -f "$ROOT/.github/workflows/evidence.yml" ]; then
  _evb="" _evknown=0
  if [ -n "$_pr_bfile" ] && [ "$_pr_bfile" != "-" ]; then
    case "$_pr_bfile" in /*|[A-Za-z]:*) _evf="$_pr_bfile" ;; *) _evf="$_pwd/$_pr_bfile" ;; esac
    # A regular file only, and its first MiB: a FIFO or /dev/zero would hold
    # the guard until its timeout, and a timed-out hook refuses nothing.
    [ -f "$_evf" ] && [ -r "$_evf" ] \
      && { _evb="$(head -c 1048576 -- "$_evf" 2>/dev/null)"; _evknown=1; }
  elif { [ "$_pr_bfile" = "-" ] && printf '%s' "$cmd" | grep -q '<<'; } \
       || { [ "$_pr_bodyset" = 1 ] && [ -z "$_pr_bfile" ]; }; then
    # Inline, or a heredoc on stdin: the body is in the command. A quote opens
    # an inline body, so it starts a line there, as the heading does in the body.
    # A body the shell computes ("$BODY", "$(cat body.md)", a backquote) is not
    # in the text: CI judges it.
    if [ "$_pr_bodyset" = 1 ] && [ -z "$_pr_bfile" ]; then
      _body_literal && { _evb="$(printf '%s\n' "$cmd" | tr "\"'" '\n\n')"; _evknown=1; }
    else
      case "$cmd" in
        *'$'*|*'`'*) ;;
        *) _evb="$(printf '%s\n' "$cmd" | tr "\"'" '\n\n')"; _evknown=1 ;;
      esac
    fi
  elif [ "$_saw_pr" = 1 ] && [ "$_pr_fill" = 1 ]; then
    _evknown=1                        # --fill writes the commit messages as the body
  fi
  if [ "$_evknown" = 1 ] && ! _ev_filled "$_evb"; then
    deny "DENIED — this repository's CI (.github/workflows/evidence.yml) fails a pull request whose
  body has no filled '## Verification evidence' section, and this body has none.
  Add that heading, then what you ran and what you observed (scripts/verify.sh,
  the steps that passed, the --observe line), and retry." "pr no evidence: $cmd"
  fi
fi
# A diff that touches sensitive_paths needs a committed, current `pass` verdict
# on the head CI will test. Judged with CI's own helpers, against the base's
# sensitive_paths as well as the branch's.
if [ "$_saw_pr" = 1 ] && [ -n "${_base:-}" ] \
   && git -C "$ROOT" rev-parse -q --verify "refs/remotes/origin/$_base^{commit}" >/dev/null 2>&1; then
  _up="refs/remotes/origin/$_base"
  _bcfg="$(mktemp 2>/dev/null || true)"
  if [ -n "$_bcfg" ]; then
    git -C "$ROOT" show "$_up:vantry.yml" > "$_bcfg" 2>/dev/null || : > "$_bcfg"
    _hits="$(cd "$ROOT" && vantry_sensitive_hits --also "$_bcfg" "$_up...$_hr" 2>/dev/null)"; _hrc=$?
    _why=""
    if [ "$_hrc" -eq 0 ] && [ -n "$_hits" ]; then
      _hb="$_cur"; [ "$_hr" = HEAD ] || _hb="${_hr#refs/heads/}"
      _slug="$(printf '%s' "$_hb" | tr '/' '-' | tr -cd 'A-Za-z0-9._-')"
      _rf=".vantry/reviews/$_slug.security.json"
      _rv="$(git -C "$ROOT" show "$_hr:$_rf" 2>/dev/null)"
      _v="$(printf '%s\n' "$_rv" | grep -o '"verdict"[[:space:]]*:[[:space:]]*"[a-z]*"' | head -1 | sed 's/.*"\([a-z]*\)"$/\1/')"
      _rh="$(printf '%s\n' "$_rv" | grep -o '"head"[[:space:]]*:[[:space:]]*"[0-9a-f]*"' | head -1 | sed 's/.*"\([0-9a-f]*\)"$/\1/')"
      _hsha="$(git -C "$ROOT" rev-parse -q --verify "$_hr^{commit}" 2>/dev/null)"
      _rsha="$(git -C "$ROOT" rev-parse -q --verify "refs/remotes/origin/$_hb^{commit}" 2>/dev/null || true)"
      if [ -z "$_rv" ]; then
        _why="$_hb carries no committed $_rf"
      elif [ "$_v" != pass ]; then
        _why="$_rf says '${_v:-nothing}', not 'pass'"
      elif [ -z "$_rh" ] || ! git -C "$ROOT" merge-base --is-ancestor "$_rh" "$_hr" 2>/dev/null; then
        _why="$_rf names no reviewed commit of $_hb"
      else
        _late="$(cd "$ROOT" && vantry_review_drift --also "$_bcfg" "$_up" "$_rh" "$_hr" 2>/dev/null)" \
          || _late="(git could not compare the review with the branch)"
        [ -n "$_late" ] && _why="sensitive files changed after the review at ${_rh:0:12}: $(printf '%s' "$_late" | tr '\n' ' ')"
      fi
      # CI reads the branch as it was PUSHED: a verdict committed and not pushed is not there.
      [ -z "$_why" ] && [ -n "$_rsha" ] && [ "$_rsha" != "$_hsha" ] \
        && _why="origin/$_hb is not $_hb: push it first, CI tests what was pushed"
    fi
    rm -f "$_bcfg"
    [ -n "$_why" ] && deny "DENIED — this PR changes security-sensitive files, and the CI check
  'sensitive paths need a security review' would fail: $_why.
  Run the security-review playbook (a separate reviewer), commit its pass verdict,
  push, then open the PR." "pr no security verdict: $cmd"
  fi
fi

exit 0
