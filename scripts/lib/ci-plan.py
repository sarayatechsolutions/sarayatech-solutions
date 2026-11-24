SEP = "\x1f"   # unit separator: NOT IFS whitespace, so empty fields survive
#!/usr/bin/env python3
# Reads .github/workflows/*.yml and emits the plan scripts/ci-local.sh executes.
# Lives in its own file rather than a heredoc because bash 3.2 — the bash that
# ships on macOS — mis-parses a here-document inside a quoted $( ), and this
# kit is not going to ship a portability bug in the tool that checks for them.
import base64, glob, json, os, platform, re, sys

event = sys.argv[1]
host = {"Darwin": "macos", "Linux": "ubuntu", "Windows": "windows"}.get(platform.system(), "")

try:
    import yaml
except ImportError:
    print("FATAL\x1fPyYAML is not installed (pip3 install pyyaml). Refusing to "
          "half-parse the workflows: a partial plan that reports green would be "
          "worse than no local CI at all.")
    sys.exit(0)

def enc(s): return base64.b64encode((s or "").encode()).decode()

# `${{ ... }}` resolution. Deliberately SMALL. Anything not in here makes the
# step unrunnable-with-a-reason rather than substituting an empty string —
# GitHub's own `A && '' || B` semantics already cost this repo a silent bug, and
# guessing at an expression locally would reproduce that class of defect.
def resolve(expr, ctx):
    e = expr.strip()
    lit = {
        "github.event_name": ctx["event"],
        "github.ref": ctx["ref"],
        "github.ref_name": ctx["ref_name"],
        "github.workspace": os.getcwd(),
        "github.repository": ctx["repo"],
        "github.base_ref": ctx["base_ref"],
        "github.head_ref": ctx["head_ref"],
        "runner.os": {"macos": "macOS", "ubuntu": "Linux"}.get(ctx.get("os", ""), ""),
    }
    for k in ctx.get("matrix", {}):
        lit["matrix." + k] = ctx["matrix"][k]
    if e in lit:
        return lit[e], None
    if (e.startswith("'") and e.endswith("'")) or e.isdigit():
        return e.strip("'"), None
    return None, e

EXPR = re.compile(r"\$\{\{([^}]*)\}\}")

def interp(text, ctx):
    """Substitute every expression, or return (None, first-unresolved)."""
    if not text or "${{" not in text:
        return text, None
    bad = []
    def one(m):
        v, u = resolve(m.group(1), ctx)
        if u is not None:
            bad.append(u); return ""
        return v
    out = EXPR.sub(one, text)
    return (None, bad[0]) if bad else (out, None)

def cond_holds(cond, ctx):
    """Only the shapes these workflows actually use. Unknown => not runnable."""
    if cond is None:
        return True, None
    c = cond.strip()
    # `always()` and `cancelled()` are literals, not guesses: one is
    # unconditionally true and the other is only ever true for a cancelled CI
    # run, which a local run is not. Everything richer — `success()`,
    # `steps.<id>.outputs.*`, boolean compounds — stays unresolved on purpose.
    # Half-understanding a condition is how a local runner produces a green that
    # means nothing, and this tool's entire value is that its green is real.
    if c == "always()":
        return True, None
    if c == "cancelled()":
        return False, None
    m = re.fullmatch(r"github\.event_name\s*(==|!=)\s*'([^']+)'", c)
    if m:
        eq = (ctx["event"] == m.group(2))
        return (eq if m.group(1) == "==" else not eq), None
    return None, c

def steps_of(job, ctx, wf_env, job_env):
    for i, st in enumerate(job.get("steps") or []):
        name = st.get("name") or (("uses: " + st["uses"]) if "uses" in st else "step %d" % (i + 1))
        if "uses" in st:
            u = st["uses"].split("@")[0]
            # These three ARE the runner's environment, not project logic:
            # the tree is already here, node is already installed, and there is
            # nowhere local to upload an artifact to. Anything else is a real gap.
            noop = {
                "actions/checkout": "the working tree is already checked out",
                "actions/setup-node": "node comes from this machine's own install",
                "actions/upload-artifact": "no artifact store outside CI",
            }
            # The working-dir field carries "@uses" on an action step: it is not a
            # `run:` line, so the coverage cross-check (a grep of `run:`) must not
            # count it, while the runner still reports it NOT RUN like any gap.
            yield ("NOOP", name, enc(""), enc("{}"), "@uses", noop.get(u, "")) if u in noop \
                else ("GAP", name, enc(""), enc("{}"), "@uses", "third-party action '%s' cannot run locally" % u)
            continue
        if "run" not in st:
            continue
        ok, unknown = cond_holds(st.get("if"), ctx)
        if ok is None:
            yield ("GAP", name, enc(""), enc("{}"), "", "step condition not understood: %s" % unknown); continue
        if ok is False:
            yield ("SKIP", name, enc(""), enc("{}"), "", "step `if:` is false for event %s" % ctx["event"]); continue
        script, bad = interp(st["run"], ctx)
        if bad is not None:
            yield ("GAP", name, enc(""), enc("{}"), "", "unresolved expression ${{ %s }}" % bad); continue
        env = {}
        for src in (wf_env, job_env, st.get("env") or {}):
            for k, v in (src or {}).items():
                val, bad = interp(str(v), ctx)
                if bad is not None:
                    val = None
                env[k] = val
        missing = [k for k, v in env.items() if v is None]
        if missing:
            yield ("GAP", name, enc(""), enc("{}"), "",
                   "env %s depends on something only CI has" % ", ".join(missing)); continue
        yield ("RUN", name, enc(script), enc(json.dumps(env)),
               st.get("working-directory") or "", "")

def triggers(wf, event):
    on = wf.get("on") if "on" in wf else wf.get(True)   # YAML 1.1 reads `on:` as True
    if on is None: return False
    if isinstance(on, str): return on == event
    if isinstance(on, list): return event in on
    return event in on

# `all` — the DEFAULT, and the one that matters.
#
# Simulating a single event reproduces CI's blind spots locally, which is the
# opposite of the point. The macOS job is excluded from `push` precisely BECAUSE
# it is meant to run here instead; planning for `push` would then skip it and
# both sides would miss it. So the default plans the UNION of every trigger the
# workflows declare, runs each job once, and says which event brings it in.
EVENTS = [event] if event != "all" else ["pull_request", "push", "schedule", "workflow_dispatch"]

# Collect across every event, then emit once per job.
#
# A job is kept at its BEST outcome across the triggers: if any event would run
# it, it runs here, and the record says which event brings it in. Emitting per
# event instead would either run the same job four times or, worse, report the
# job as skipped because the LAST event happened not to enable it.
wf_state = {}      # path -> (name, triggered_by or None)
jobs = {}          # (path, label) -> dict(rank, status, detail, event, steps)
RANK = {"RUN": 3, "OTHER-OS": 2, "SKIP": 1, "GAP": 0}

def keep(path, label, status, detail, ev, steps=None):
    k = (path, label)
    cur = jobs.get(k)
    if cur is None or RANK[status] > RANK[cur["status"]]:
        jobs[k] = {"status": status, "detail": detail, "event": ev, "steps": steps or []}

for event in EVENTS:
    for path in sorted(glob.glob(".github/workflows/*.yml")):
        wf = yaml.safe_load(open(path)) or {}
        wfname = wf.get("name") or os.path.basename(path)
        if path not in wf_state:
            wf_state[path] = [wfname, None]
        if not triggers(wf, event):
            continue
        if wf_state[path][1] is None:
            wf_state[path][1] = event
        for jid, job in (wf.get("jobs") or {}).items():
            mat = ((job.get("strategy") or {}).get("matrix") or {})
            combos = [{}]
            if mat:
                keys = [k for k in mat if k not in ("include", "exclude")]
                combos = []
                def build(i, acc):
                    if i == len(keys):
                        combos.append(dict(acc)); return
                    for v in mat[keys[i]]:
                        acc[keys[i]] = str(v); build(i + 1, acc)
                build(0, {})
            for combo in combos:
                ctx = {"event": event, "ref": "refs/heads/main", "ref_name": "main",
                       "repo": "local/local", "base_ref": "main", "head_ref": "local",
                       "matrix": combo}
                runs_on_raw = str(job.get("runs-on") or "ubuntu-latest")
                # Is the OS the VARIABLE UNDER TEST, or just where a runner
                # happened to be rented? A leg pinned to macos-latest by a matrix
                # exists to catch BSD-vs-GNU divergence, so running it on Linux
                # would prove nothing and saying otherwise would be a lie. A
                # plain `runs-on: ubuntu-latest` job is different: ordinary shell
                # that runs anywhere. Refusing to run THOSE locally would gut the
                # point of this tool. So matrix legs belong to CI; plain jobs run
                # here, labelled with the runner difference, never silently.
                from_matrix = "matrix." in runs_on_raw
                runs_on, _bad = interp(runs_on_raw, ctx)
                os_key = ""
                for k in ("macos", "ubuntu", "windows"):
                    if runs_on and k in runs_on:
                        os_key = k
                ctx["os"] = os_key
                label = job.get("name") or jid
                if combo:
                    label += " (" + ", ".join("%s=%s" % kv for kv in combo.items()) + ")"
                jok, unknown = cond_holds(job.get("if"), ctx)
                if jok is None:
                    keep(path, label, "GAP", "job condition not understood: %s" % unknown, event); continue
                if jok is False:
                    keep(path, label, "SKIP", "job `if:` is false for every trigger checked", event); continue
                if os_key and host and os_key != host and from_matrix:
                    keep(path, label, "OTHER-OS",
                         "this matrix leg exists to test %s; this machine is %s — CI owns it" % (os_key, host),
                         event); continue
                detail = runs_on if not (os_key and host and os_key != host) \
                         else "%s (running on %s here)" % (runs_on, host)
                keep(path, label, "RUN", detail, event,
                     list(steps_of(job, ctx, wf.get("env") or {}, job.get("env") or {})))

# On CI these are separate rented machines and running both is the whole point.
# Here they are the SAME machine, so two jobs whose steps are byte-identical
# would burn the developer's time twice for one signal. The second is reported
# as already covered, naming the first — never dropped in silence.
_sig_seen = {}
for (p2, label), rec in jobs.items():
    if rec["status"] != "RUN":
        continue
    sig = tuple(sorted((k, sc) for k, _n, sc, _e, _w, _y in rec["steps"] if k == "RUN"))
    if not sig:
        continue
    if sig in _sig_seen:
        rec["status"] = "DUP"
        rec["detail"] = "identical steps to \u2018%s\u2019, which runs above on this same machine" % _sig_seen[sig]
        # Re-labelled, NOT discarded: these steps are covered, and the coverage
        # cross-check has to keep seeing them. Dropping them would make the plan
        # come up short against the grep count and turn a correct optimisation
        # into an unexplained gap.
        # Only the steps that WOULD have run become DUP. A `uses:` no-op is not
        # a covered shell step and must not be counted as one — that one slip
        # made the plan claim 20 steps against grep's 19, which is precisely the
        # disagreement the cross-check exists to catch.
        rec["steps"] = [(("DUP" if k == "RUN" else k), n, sc, e, w, y)
                        for (k, n, sc, e, w, y) in rec["steps"]]
    else:
        _sig_seen[sig] = label

for path, (wfname, trig) in sorted(wf_state.items()):
    if trig is None:
        print("WF\x1f%s\x1f%s\x1fNOT-TRIGGERED\x1fno trigger in this workflow matches %s"
              % (path, wfname, ", ".join(EVENTS)))
        continue
    print("WF\x1f%s\x1f%s\x1fTRIGGERED\x1fon %s" % (path, wfname, trig))
    for (p2, label), rec in jobs.items():
        if p2 != path:
            continue
        suffix = "" if rec["event"] == trig or rec["status"] != "RUN" else "  [via %s]" % rec["event"]
        print("JOB\x1f%s\x1f%s\x1f%s\x1f%s%s" % (path, label, rec["status"], rec["detail"], suffix))
        for kind, nm, sc, env, wd, why in rec["steps"]:
            print("ST\x1f%s\x1f%s\x1f%s\x1f%s\x1f%s\x1f%s" % (kind, nm, sc, env, wd, why))
