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
