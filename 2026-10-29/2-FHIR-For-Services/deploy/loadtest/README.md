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

## Run 3 (2026-10-19, LIVE DiSP stack redeployed from the committed manifests: banner proxy, explicit CPU limits, fresh database): PASS

5,763 requests in 480 s (12.0 req/s), 40 virtual users, **0 errors**; cleanup deleted all 362 tagged resources.
Error rate 0.00%, UI p95 1.88 s (provider search p50 1.55 s, p95 2.05 s; all other UI calls p95 < 0.2 s), FHIR read p95 0.11 s,
FHIR write p95 0.04 s, `$validate` p95 0.13 s (no cold-start 504s: the smoke test had warmed the validation cache first).
Peaks from `kubectl top`: referral HAPI 0.63 CPU / 1.98 Gi (mean 0.22 CPU), directory 0.23 CPU / 1.27 Gi, UI 0.05 CPU, banner proxy
0.01 CPU. (The Postgres samples look implausibly low at 6m; treat the database figure as unverified.)
