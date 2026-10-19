#!/usr/bin/env python3
"""Track 2 load test (stdlib only): N virtual users against the UI and the two FHIR servers.

Usage: loadtest.py [--base https://qh-fhir-test.dw.csiro.au] [--users 40] [--warm 45] [--ramp 90] [--hold 300] [--down 20]
                   [--api-share 0.4] [--no-cleanup] [--out result.json]

Mix per virtual user (fixed at start, `--api-share` of the users are API-style):
  browser VU  UI pages (/, /fhir/Patients, /fhir/Dashboard, /fhir/Demographics, /fhir/RequesterOrganisations),
              provider search, and now and then the indication typeahead (which the UI forwards to the tx server;
              kept rare because r4.ontoserver is a shared public server)
  api VU      directory search, open referrals, free slots; every few iterations a write flow
              (create ServiceRequest + Task, triage the Task) and now and then a $validate
Everything written is tagged urn:qh-connectathon:loadtest|<run id> and deleted at the end (unless --no-cleanup).
Think time 1-4 s per step. Exit code 1 if the pass criteria are missed:
  error rate < 1%, UI p95 < 2 s, FHIR read p95 < 1.5 s, FHIR write p95 < 2 s.
"""
import argparse, http.client, json, random, ssl, sys, threading, time, urllib.parse
from collections import defaultdict

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="https://qh-fhir-test.dw.csiro.au")
ap.add_argument("--users", type=int, default=40)
ap.add_argument("--warm", type=int, default=45, help="seconds at 3 users before the ramp (validation/JIT warm-up)")
ap.add_argument("--ramp", type=int, default=90)
ap.add_argument("--hold", type=int, default=300)
ap.add_argument("--down", type=int, default=20)
ap.add_argument("--api-share", type=float, default=0.4)
ap.add_argument("--no-cleanup", action="store_true")
ap.add_argument("--out", default="")
args = ap.parse_args()

U = urllib.parse.urlsplit(args.base)
REF, DIR = "/referral/fhir", "/directory/fhir"
RUN = time.strftime("%Y%m%d%H%M%S", time.gmtime())
TAG = {"system": "urn:qh-connectathon:loadtest", "code": RUN}
TOWNS = ["Cairns", "Moreton", "Townsville", "Toowoomba", "Southport", "Rockhampton", "Bundaberg", "Herston", "Tropic"]
CTX = ssl.create_default_context()

lock = threading.Lock()
samples = []            # (name, kind, seconds, ok)
created = []            # (type, id) for cleanup
errors = defaultdict(int)
stop_at = [0.0]
active = [0]


class Client:
    def __init__(self):
        self.c = None

    def req(self, name, kind, method, path, body=None, headers=None):
        t0 = time.perf_counter()
        ok, status, data = False, 0, b""
        for attempt in (1, 2):
            try:
                if self.c is None:
                    self.c = http.client.HTTPSConnection(U.hostname, U.port or 443, timeout=60, context=CTX)
                h = {"Accept": "application/fhir+json, text/html;q=0.8", "Connection": "keep-alive"}
                if body is not None:
                    h["Content-Type"] = (headers or {}).get("Content-Type", "application/fhir+json")
                self.c.request(method, path, body=body, headers=h)
                r = self.c.getresponse()
                data = r.read()
                status = r.status
                ok = status < 400
                break
            except Exception as e:  # reconnect once on a broken keep-alive connection
                try:
                    self.c.close()
                except Exception:
                    pass
                self.c = None
                if attempt == 2:
                    with lock:
                        errors["exc:" + type(e).__name__] += 1
        dt = time.perf_counter() - t0
        with lock:
            samples.append((name, kind, dt, ok))
            if not ok:
                errors["%s %s" % (name, status)] += 1
        return status, data


def js(r):
    try:
        return json.loads(r)
    except Exception:
        return {}


def think():
    time.sleep(random.uniform(1.0, 4.0))


def alive():
    return time.time() < stop_at[0]


def browser_vu(c, seed_pid):
    steps = [
        lambda: c.req("ui /", "ui", "GET", "/"),
        lambda: c.req("ui /fhir/Patients", "ui", "GET", "/fhir/Patients"),
        lambda: c.req("ui /fhir/Dashboard", "ui", "GET", "/fhir/Dashboard"),
        lambda: c.req("ui /fhir/Demographics", "ui", "GET", "/fhir/Demographics"),
        lambda: c.req("ui /fhir/RequesterOrganisations", "ui", "GET", "/fhir/RequesterOrganisations?for=sp"),
        lambda: c.req("ui provider-search", "ui", "GET", "/provider-search?pdUnifiedQuery=" + random.choice(TOWNS)),
        lambda: c.req("ui provider-search", "ui", "GET", "/provider-search?pdUnifiedQuery=" + random.choice(TOWNS)),
        lambda: c.req("ui patient search", "ui", "POST", "/fhir/search_patients", body="q=a&page=1&per_page=10",
                      headers={"Content-Type": "application/x-www-form-urlencoded"}),
    ]
    rare = lambda: c.req("ui indication typeahead (tx)", "tx", "GET",
                         "/fhir/indicationvalueset/expand?indication_display=" + random.choice(["pain", "cough", "fracture"]))
    while alive():
        for s in random.sample(steps, k=4):
            if not alive():
                return
            s()
            think()
        if random.random() < 0.15 and alive():
            rare()
            think()


def api_vu(c, seed_pid):
    mine = []
    n = 0
    while alive():
        n += 1
        c.req("dir HealthcareService search", "read", "GET",
              DIR + "/HealthcareService?service-type=http://snomed.info/sct|310128004&_include=HealthcareService:organization&_include=HealthcareService:location")
        think()
        if not alive():
            break
        c.req("dir Organization list", "read", "GET", DIR + "/Organization?_count=50")
        think()
        c.req("ref Task requested", "read", "GET", REF + "/Task?status=requested")
        think()
        c.req("ref Slot free", "read", "GET", REF + "/Slot?status=free&_count=10")
        think()
        if n % 3 == 0 and alive():   # write flow
            sr = {"resourceType": "ServiceRequest", "meta": {"tag": [TAG]}, "status": "active", "intent": "order",
                  "subject": {"reference": "Patient/" + seed_pid}, "code": {"text": "load test"}}
            st, d = c.req("ref create ServiceRequest", "write", "POST", REF + "/ServiceRequest", json.dumps(sr))
            sid = js(d).get("id")
            if sid:
                mine.append(("ServiceRequest", sid))
                task = {"resourceType": "Task", "meta": {"tag": [TAG]}, "status": "requested", "intent": "order",
                        "focus": {"reference": "ServiceRequest/" + sid}}
                st, d = c.req("ref create Task", "write", "POST", REF + "/Task", json.dumps(task))
                tid = js(d).get("id")
                if tid:
                    mine.append(("Task", tid))
                    task.update({"id": tid, "status": "accepted"})
                    c.req("ref triage Task (PUT)", "write", "PUT", REF + "/Task/" + tid, json.dumps(task))
            think()
        if n % 5 == 0 and alive():   # validation is the CPU-heavy call participants will use
            vsr = {"resourceType": "ServiceRequest", "meta": {"profile": ["http://aehrc.csiro.au/fhir/radiology-referral/StructureDefinition/referral-servicerequest"]},
                   "status": "active", "intent": "order", "subject": {"reference": "Patient/" + seed_pid}}
            c.req("ref $validate ServiceRequest", "validate", "POST", REF + "/ServiceRequest/$validate", json.dumps(vsr))
            think()
    with lock:
        created.extend(mine)


def vu_runner(i, seed_pid, start_at):
    time.sleep(max(0.0, start_at - time.time()))
    if not alive():
        return
    with lock:
        active[0] += 1
    c = Client()
    try:
        (api_vu if i < args.users * args.api_share else browser_vu)(c, seed_pid)
    finally:
        with lock:
            active[0] -= 1


def pct(v, p):
    if not v:
        return 0.0
    v = sorted(v)
    return v[min(len(v) - 1, int(round(p / 100.0 * (len(v) - 1))))]


def main():
    c0 = Client()
    st, d = c0.req("setup Patient", "setup", "GET", REF + "/Patient?_count=1")
    pid = (js(d).get("entry") or [{}])[0].get("resource", {}).get("id")
    if not pid:
        print("cannot find a seed Patient on the referral server: seed loaded?", file=sys.stderr)
        return 2
    with lock:
        samples.clear()
    total = args.warm + args.ramp + args.hold + args.down
    t0 = time.time()
    stop_at[0] = t0 + total
    warm_users = min(3, args.users)
    # schedule start times: 3 users now (warm-up), the rest spread across the ramp
    starts = [t0] * warm_users + [t0 + args.warm + (k * args.ramp / max(1, args.users - warm_users)) for k in range(args.users - warm_users)]
    ths = [threading.Thread(target=vu_runner, args=(i, pid, s), daemon=True) for i, s in enumerate(starts)]
    # api VUs are the low indices; interleave so warm-up users include both kinds
    for t in ths:
        t.start()
    print("run %s: %d users, warm %ds ramp %ds hold %ds down %ds against %s" % (RUN, args.users, args.warm, args.ramp, args.hold, args.down, args.base), flush=True)
    while time.time() < stop_at[0]:
        time.sleep(30)
        with lock:
            n = len(samples); e = sum(1 for s in samples if not s[3])
        print("  t=%3ds active=%2d requests=%d errors=%d" % (time.time() - t0, active[0], n, e), flush=True)
    for t in ths:
        t.join(timeout=90)
    elapsed = time.time() - t0

    # ---- cleanup
    deleted = failed = 0
    if not args.no_cleanup and created:
        print("cleanup: deleting %d tagged resources" % len(created), flush=True)
        todel = [x for x in created if x[0] == "Task"] + [x for x in created if x[0] == "ServiceRequest"]
        def worker(chunk):
            nonlocal deleted, failed
            c = Client()
            for typ, rid in chunk:
                st, _ = c.req("cleanup", "cleanup", "DELETE", "%s/%s/%s" % (REF, typ, rid))
                with lock:
                    if st < 400: deleted += 1
                    else: failed += 1
        for phase_items in ([x for x in todel if x[0] == "Task"], [x for x in todel if x[0] == "ServiceRequest"]):
            chunks = [phase_items[i::8] for i in range(8)]
            ws = [threading.Thread(target=worker, args=(ch,)) for ch in chunks if ch]
            [w.start() for w in ws]; [w.join() for w in ws]
        print("cleanup: deleted %d, failed %d" % (deleted, failed))

    body = [s for s in samples if s[1] != "cleanup"]
    by = defaultdict(list)
    for name, kind, dt, ok in body:
        by[(kind, name)].append((dt, ok))
    print("\n%-34s %6s %5s %7s %7s %7s %7s" % ("request", "count", "err", "p50 s", "p95 s", "p99 s", "max s"))
    rows = []
    for (kind, name), v in sorted(by.items()):
        ds = [x[0] for x in v]
        err = sum(1 for x in v if not x[1])
        rows.append({"name": name, "kind": kind, "count": len(v), "errors": err, "p50": pct(ds, 50), "p95": pct(ds, 95), "p99": pct(ds, 99), "max": max(ds)})
        print("%-34s %6d %5d %7.2f %7.2f %7.2f %7.2f" % (name, len(v), err, pct(ds, 50), pct(ds, 95), pct(ds, 99), max(ds)))
    nerr = sum(1 for s in body if not s[3])
    rate = 100.0 * nerr / max(1, len(body))
    def kp(kinds, p=95):
        return pct([s[2] for s in body if s[1] in kinds], p)
    checks = [("error rate < 1%", rate < 1.0, "%.2f%%" % rate),
              ("UI p95 < 2 s", kp(("ui",)) < 2.0, "%.2f s" % kp(("ui",))),
              ("FHIR read p95 < 1.5 s", kp(("read",)) < 1.5, "%.2f s" % kp(("read",))),
              ("FHIR write p95 < 2 s", kp(("write",)) < 2.0, "%.2f s" % kp(("write",)))]
    print("\n%d requests in %.0fs (%.1f req/s), %d errors (%.2f%%)" % (len(body), elapsed, len(body) / elapsed, nerr, rate))
    for k, v in sorted(errors.items(), key=lambda x: -x[1])[:8]:
        print("  error: %s x%d" % (k, v))
    allok = True
    for name, ok, val in checks:
        print("%s  %s (%s)" % ("PASS" if ok else "FAIL", name, val))
        allok &= ok
    if args.out:
        json.dump({"run": RUN, "base": args.base, "users": args.users, "elapsed": elapsed, "requests": len(body), "errors": nerr,
                   "rows": rows, "checks": [{"name": n, "pass": o, "value": v} for n, o, v in checks],
                   "cleanup": {"deleted": deleted, "failed": failed}, "error_kinds": dict(errors)}, open(args.out, "w"), indent=2)
    return 0 if allok else 1


if __name__ == "__main__":
    sys.exit(main())
