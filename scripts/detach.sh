#!/usr/bin/env bash
# =============================================================================
#  detach.sh — start a long command (a gate, a mutation batch) fully detached
#  from the calling shell, its output in a log file.
#
#  Why: an agent's shell does not own its children for long. On Windows, Claude
#  Code runs its tools inside a job object; `nohup`, `&`, `disown` and even
#  PowerShell Start-Process children inherit that job and are killed with it
#  when the shell is recycled or the session ends. A 70-minute gate died three
#  times this way with exit 143/137 while every test was passing (17 Oct 2026).
#  On Windows this launcher starts the command through WMI (Win32_Process.Create),
#  whose children belong to the WMI provider host, not to the caller's job.
#  On Linux/macOS it uses nohup + setsid (new session, no controlling terminal).
#
#  The detached process does NOT inherit the caller's environment on Windows, so
#  the exported environment and the working directory are written to a private
#  file that the runner sources and deletes before running the command.
#
#  Usage:   scripts/detach.sh LOGFILE command [args...]
#  Prints:  the PID of the detached runner (a Windows PID on Windows; check it
#           with `tasklist //FI "PID eq N"`), then returns at once.
#  The command's exit code is appended to LOGFILE as `detach-exit=N`.
# =============================================================================
set -uo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: scripts/detach.sh LOGFILE command [args...]" >&2
  exit 2
fi
_log="$1"; shift
case "$_log" in /*|[A-Za-z]:*) ;; *) _log="$PWD/$_log" ;; esac
mkdir -p "$(dirname "$_log")" || exit 2
: > "$_log" || { echo "detach: cannot write $_log" >&2; exit 2; }

_dir="$(mktemp -d "${TMPDIR:-/tmp}/vantry-detach.XXXXXX")" || exit 2
chmod 700 "$_dir" 2>/dev/null || true
_env="$_dir/env.sh"; _run="$_dir/run.sh"

# The exported environment, quoted with %q so values with spaces or newlines
# survive. Shell-managed and read-only names are left to the new bash.
(
  umask 077
  for _n in $(compgen -e); do
    case "$_n" in
      *[!A-Za-z0-9_]*|[0-9]*|_|PWD|OLDPWD|SHLVL|SHELLOPTS|BASHOPTS|BASHPID|BASH_*|UID|EUID|PPID) continue ;;
    esac
    printf 'export %s=%q\n' "$_n" "${!_n}"
  done
  printf 'cd %q || exit 2\n' "$PWD"
) > "$_env"

{
  echo '#!/usr/bin/env bash'
  printf '. %q; rm -f %q\n' "$_env" "$_env"
  printf 'exec >>%q 2>&1 </dev/null\n' "$_log"
  printf '%q ' "$@"; echo
  echo 'echo "detach-exit=$?"'
  printf 'rm -rf %q\n' "$_dir"
} > "$_run"
chmod 700 "$_run" 2>/dev/null || true

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    _bash="$(cygpath -w "$(command -v bash)")"
    _runw="$(cygpath -w "$_run")"
    # The command line travels in an environment variable, so no quoting layer
    # of PowerShell or cmd ever parses it.
    VD_CMDLINE="\"$_bash\" \"$_runw\"" powershell.exe -NoProfile -NonInteractive -Command '
      $si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
      $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $env:VD_CMDLINE; ProcessStartupInformation = $si }
      if ($r.ReturnValue -ne 0) { [Console]::Error.WriteLine("Win32_Process.Create returned " + $r.ReturnValue); exit 1 }
      $r.ProcessId' | tr -d '\r'
    _rc=${PIPESTATUS[0]}
    ;;
  *)
    if command -v setsid >/dev/null 2>&1; then
      nohup setsid bash "$_run" >/dev/null 2>&1 </dev/null &
    else
      nohup bash "$_run" >/dev/null 2>&1 </dev/null &
    fi
    echo "$!"; disown 2>/dev/null || true
    _rc=0
    ;;
esac

if [ "$_rc" -ne 0 ]; then
  echo "detach: could not start the detached process" >&2
  rm -rf "$_dir"
  exit 1
fi
