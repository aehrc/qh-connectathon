# Track 2 load test

`loadtest.py` (stdlib only) drives N virtual users (default 40, 40% API-style, 60% browser-style) against the UI and both
FHIR servers: warm-up (3 users), ramp, hold, ramp down; think time 1-4 s; everything it writes is tagged
`urn:qh-connectathon:loadtest|<run id>` and deleted at the end. Pass criteria: error rate < 1%, UI p95 < 2 s,
FHIR read p95 < 1.5 s, FHIR write p95 < 2 s. Terminology calls (UI typeahead) are kept rare (about 1 request/s overall)
because r4.ontoserver is a shared public server.

```
python3 -I loadtest.py --base https://qh-fhir-test.dw.csiro.au --users 40 --out result.json
```

## Run 1 (2026-10-19, DiSP scratch stack, referral HAPI at the default 2 CPU limit): FAIL

3,640 requests in 480 s, 7.1% errors. Directory reads, provider search, typeahead and `/` were fine (p95 0.1-2 s, 0 errors).
Everything touching the referral server degraded from about t=270 s (504s at the 15 s ingress timeout, UI 500s at its own 10 s
timeout), and the referral pod then failed readiness (503) and did not recover after the test ended.

Cause: `java.lang.OutOfMemoryError: Java heap space` in the referral HAPI. The hapiproject/hapi entrypoint is a bare
`java --class-path ... PropertiesLauncher` and ignores `JAVA_OPTS`, so our `-Xmx2g` never applied; the JVM used its default
heap (25% of the 3 Gi limit, about 750 MB). The 2 CPU burn was GC thrash, not real work, and the readiness probe's 1 s timeout
removed the pod from the Service. The live DiSP stack has the same latent problem.

Fix (this commit): `JAVA_TOOL_OPTIONS` (`-Xmx2560m` referral, `-Xmx1536m` directory), referral limits 3 CPU / 4 Gi,
readiness `timeoutSeconds: 5`. AWS overlay: `-Xmx3g`, 4 CPU / 5 Gi.

## Run 2 (2026-10-19, same stack after the heap fix: JAVA_TOOL_OPTIONS, referral 3 CPU / 4 Gi): PASS

5,740 requests in 480 s (12.0 req/s) from 40 virtual users, 2 errors (0.03%); cleanup deleted all 352 tagged resources.

| Criterion | Result |
|---|---|
| error rate < 1% | PASS, 0.03% (two `$validate` 504s at the 15 s ingress timeout, in the first minute while HAPI built its validation cache) |
| UI p95 < 2 s | PASS, 1.89 s (driven by provider search: p50 1.6 s, p95 2.05 s; every other UI call p95 < 0.2 s) |
| FHIR read p95 < 1.5 s | PASS, 0.11 s |
| FHIR write p95 < 2 s | PASS, 0.04 s |

Peaks: referral HAPI 2.0 CPU (during the first-minute validation warm-up; 0.3-0.5 CPU in the hold) and 2.48 Gi; directory 0.36 CPU / 1.4 Gi; Postgres 0.16 CPU; UI 0.1 CPU / 58 Mi. The typeahead (forwarded to r4.ontoserver) ran at about 0.2 req/s with p95 0.69 s and p99 4.5 s.

Watch: provider search is the slowest UI call (about 1.6 s median under load) and sits close to the 2 s p95 criterion; the first `$validate` after a restart can 504, so warm the servers before the event. The test is a lower bound on write volume (about 3 writes per API user every 10 s) and was run from one workstation over the CSIRO network.

## Run 3 (2026-10-19): INVALID, superseded by run 4

**Do not rely on this run.** The live Services also selected the scratch pods (shared `app=` labels), so the load was split across both stacks and the
resource figures are about half the real ones. Kept for the record; see run 4 below.

Original entry (live DiSP stack redeployed from the committed manifests: banner proxy, explicit CPU limits, fresh database): PASS

5,763 requests in 480 s (12.0 req/s), 40 virtual users, **0 errors**; cleanup deleted all 362 tagged resources.
Error rate 0.00%, UI p95 1.88 s (provider search p50 1.55 s, p95 2.05 s; all other UI calls p95 < 0.2 s), FHIR read p95 0.11 s,
FHIR write p95 0.04 s, `$validate` p95 0.13 s (no cold-start 504s: the smoke test had warmed the validation cache first).
Peaks from `kubectl top`: referral HAPI 0.63 CPU / 1.98 Gi (mean 0.22 CPU), directory 0.23 CPU / 1.27 Gi, UI 0.05 CPU, banner proxy
0.01 CPU. (The Postgres samples look implausibly low at 6m; treat the database figure as unverified.)

## Run 4 (2026-10-20, LIVE DiSP stack after the isolation fix and a fresh reset, seeded, frog fixtures cleaned): PASS

5,740 requests in 480 s (12.0 req/s), 40 virtual users, **0 errors**; cleanup deleted all 360 tagged resources.
Error rate 0.00%, UI p95 1.89 s (provider search p50 1.55 s, p95 2.04 s; every other UI call p95 < 0.2 s), FHIR read p95 0.14 s,
FHIR write p95 0.07 s, `$validate` p95 0.18 s.

Peaks from `kubectl top` (all load now on the one live stack): referral HAPI **0.90 CPU peak, 0.53 mean**, 2.0 Gi; directory HAPI 0.54 peak,
0.40 mean, 1.57 Gi; Postgres 0.30 peak, 0.25 mean; UI 0.10 peak; banner proxy 0.01. These are the figures to size from.

## Run 5 (2026-10-21, AWS EKS stack, seeded, UI v1.0.0): PASS

5,853 requests in 480 s (12.2 req/s), 40 virtual users, **0 errors**; cleanup deleted all 364 tagged resources.
UI p95 1.84 s (provider search p50 1.52 s, p95 2.00 s; every other UI call p95 < 0.2 s), FHIR read p95 0.07 s, FHIR write p95 0.04 s,
`$validate` p95 0.11 s, terminology typeahead p95 0.06 s (p99 0.53 s). Run from a CSIRO workstation over the public internet. No per-pod CPU
figures were taken on AWS. Provider search stays the slowest call and sits right at the 2 s criterion.

## Run 6 (2026-10-21, AWS, per-function hosts): INVALID, pods evicted mid-run

21.2% errors (503 from HAPI, 500 from the UI) because EKS Auto Mode consolidated an "underutilized" node at 10:41 local and evicted the Track 2
pods (`Evicted pod: Underutilized`) while the test ran. The fix is `karpenter.sh/do-not-disrupt` on every Track 2 workload (efiq overlay). Not a
capacity result: the same stack passed run 7.

## Run 7 (2026-10-21, AWS, per-function hosts: ui / referrals / directory, `do-not-disrupt` set): PASS

5,828 requests in 480 s (12.1 req/s), 40 virtual users, **0 errors**. UI p95 1.85 s (provider search p95 2.03 s, every other UI call p95 < 0.2 s), FHIR read
p95 0.07 s, write p95 0.04 s, `$validate` p95 0.05 s, terminology typeahead p95 0.09 s. Run from a CSIRO workstation over the public internet.
