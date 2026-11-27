#!/usr/bin/env bash
# =============================================================================
#  toolchain.sh — which JDK does this repository pin? CI installs exactly that.
#
#  Why this exists. verify.yml set up Node and nothing else, so a Java build ran
#  on whatever JDK the runner image happened to ship. GitHub moves that default
#  without notice. In an adopting repository the build pinned Java 17, passed
#  locally on 21, and one morning failed in CI on a newer runner default, inside
#  the compiler (an annotation processor that does not support that JDK). No
#  line of the project had changed. A toolchain the repository declares is part
#  of the contract; CI must read it, never guess it.
#
#  Usage:
#    scripts/lib/toolchain.sh                  print java=<major> and java_cache=
#    scripts/lib/toolchain.sh --github-output  also append them to $GITHUB_OUTPUT
#
#  Sources, first match wins: .java-version, .sdkmanrc, .tool-versions, then the
#  root pom.xml, then the root build.gradle(.kts). A JVM build at the root that
#  declares no version is reported as a ::warning:: and left to the runner
#  default, exactly as before: this script adds a pin, it never invents one.
#  Exit status is 0 unless the arguments are wrong.
# =============================================================================
set -uo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
out_gh=0
case "${1:-}" in
  "") ;;
  --github-output) out_gh=1 ;;
  *) echo "usage: $0 [--github-output]" >&2; exit 2 ;;
esac

# "17", "17.0.9", "temurin-17.0.9+9", "21.0.1-tem", "1.8" → 17 17 17 21 8.
# The first number decides; the legacy 1.N form means N.
major() {
  local v
  v="$(printf '%s\n' "$1" | grep -oE '[0-9]+(\.[0-9]+)?' | head -n 1)"
  case "$v" in
    1.*) v="${v#1.}" ;;
    *)   v="${v%%.*}" ;;
  esac
  case "$v" in ''|*[!0-9]*) return 1 ;; esac
  [ "$v" -ge 6 ] 2>/dev/null || return 1
  printf '%s\n' "$v"
}

# The text between <tag> and </tag>, first occurrence, digits and dots only — a
# ${property} reference is not a version and is skipped, never followed.
xml_value() {
  sed -n "s:.*<$1>[[:space:]]*\([0-9][0-9.]*\)[[:space:]]*</$1>.*:\1:p" "$2" | head -n 1
}

java=""; src=""
if [ -f "$root/.java-version" ]; then
  java="$(major "$(head -n 1 "$root/.java-version")")" && src=".java-version"
fi
if [ -z "$java" ] && [ -f "$root/.sdkmanrc" ]; then
  java="$(major "$(sed -n 's/^[[:space:]]*java[[:space:]]*=[[:space:]]*//p' "$root/.sdkmanrc" | head -n 1)")" && src=".sdkmanrc"
fi
if [ -z "$java" ] && [ -f "$root/.tool-versions" ]; then
  java="$(major "$(sed -n 's/^[[:space:]]*java[[:space:]][[:space:]]*//p' "$root/.tool-versions" | head -n 1)")" && src=".tool-versions"
fi
if [ -z "$java" ] && [ -f "$root/pom.xml" ]; then
  for tag in maven.compiler.release java.version release maven.compiler.target maven.compiler.source; do
    v="$(xml_value "$tag" "$root/pom.xml")"
    [ -n "$v" ] || continue
    java="$(major "$v")" && { src="pom.xml <$tag>"; break; }
  done
fi
if [ -z "$java" ]; then
  for f in build.gradle.kts build.gradle; do
    [ -f "$root/$f" ] || continue
    v="$(grep -oE 'JavaLanguageVersion\.of\([[:space:]]*[0-9]+|jvmToolchain\([[:space:]]*[0-9]+|JavaVersion\.VERSION_[0-9_]+|(source|target)Compatibility[[:space:]]*=[[:space:]]*['\''"]?[0-9][0-9.]*' "$root/$f" \
           | head -n 1 | sed -e 's/.*VERSION_//' -e 's/_/./g')"
    [ -n "$v" ] || continue
    java="$(major "$v")" && { src="$f"; break; }
  done
fi

cache=""
if [ -f "$root/pom.xml" ]; then cache="maven"
elif [ -f "$root/build.gradle" ] || [ -f "$root/build.gradle.kts" ] \
  || [ -f "$root/settings.gradle" ] || [ -f "$root/settings.gradle.kts" ]; then cache="gradle"
fi

if [ -n "$java" ]; then
  echo "→ Java $java, pinned by $src" >&2
elif [ -n "$cache" ]; then
  echo "::warning::This repository builds with ${cache} but pins no JDK, so CI uses whatever the runner image ships, and that changes without notice. Pin it: echo 17 > .java-version (your real version), or set <maven.compiler.release> / a Gradle toolchain." >&2
fi

# Node is installed by verify.yml itself, from .nvmrc / .node-version, or a
# fixed default when neither exists. Same drift, same warning: say so.
if [ -f "$root/package.json" ] && [ ! -f "$root/.nvmrc" ] && [ ! -f "$root/.node-version" ]; then
  echo "::warning::This repository has a package.json but no .nvmrc or .node-version, so CI uses the workflow's default Node, which is not necessarily the one you develop on. Pin it: node --version > .nvmrc" >&2
fi

printf 'java=%s\njava_cache=%s\n' "$java" "$cache"
if [ "$out_gh" -eq 1 ]; then
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf 'java=%s\njava_cache=%s\n' "$java" "$cache" >> "$GITHUB_OUTPUT"
  else
    echo "toolchain: --github-output given but GITHUB_OUTPUT is not set; printed only" >&2
  fi
fi
exit 0
