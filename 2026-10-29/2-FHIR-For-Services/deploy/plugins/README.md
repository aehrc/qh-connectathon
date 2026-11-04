# HAPI plugins

Jars that the referral HAPI server (deployment `fhir` only, not `directory`) loads at startup, vendored here exactly like the IG tarballs in `../ig-packages/`
and served by commit SHA from the public repo. Verify before every deploy: `cd deploy/plugins && sha256sum -c SHA256SUMS`.

| File | What | Source |
|---|---|---|
| `hapi-fhir-au-ps-0.1.0.jar` | AU Patient Summary: `Patient/[id]/$summary` (HAPI IPS, AU PS profile). 7,302 bytes, 3 classes plus an `application.yaml` | `hapi-fhir-au-ps` branch `chore/hapi-8.12.0` (hapi.version 8.12.0), commit 3ebb27e plus the uncommitted 8.12.0 bump, built with `mvn -B -o -q clean package -DskipTests`, copied from `target/hapi-fhir-au-ps.jar` |

## How the pod uses it

The stock `hapiproject/hapi` image has no shell. An initContainer (`alpine:3.20`, as in `base/60-frog.yaml`) downloads the jar from the pinned raw URL,
checks its sha256, and writes it to an `emptyDir`; the `hapi` container mounts that at `/app/extra-classes` (already on the image's `-Dloader.path`).
Two settings switch it on: `HAPI_FHIR_CUSTOM_BEAN_PACKAGES=au.csiro.aehrc.aups` and `HAPI_FHIR_IPS_ENABLED=true`.
`LOADER_PATH` is not needed (see `../DEPLOYMENT.md`, section 6a).

## Commit-pinning sequence (two steps; the URL needs a commit that already contains the jar)

1. Commit 1 adds this directory (jar, `SHA256SUMS`, this file) and changes no manifest. Note its SHA, `<JARSHA>`.
2. Commit 2 changes `base/20-fhir.yaml` to download
   `https://raw.githubusercontent.com/aehrc/qh-connectathon/<JARSHA>/2026-10-29/2-FHIR-For-Services/deploy/plugins/hapi-fhir-au-ps-0.1.0.jar`
   and to expect the sha256 in `SHA256SUMS`. The manifest commit is a different (later) commit; the URL never points at itself.
3. Both commits must reach `track2-prep-wip` (Flux's branch) and the raw URL must return 200 BEFORE Flux reconciles commit 2. If the push is a rebase/squash,
   `<JARSHA>` changes: re-pin to the SHA that exists on the remote branch. Check: `curl -sI <url> | head -1` and `curl -s <url> | sha256sum`.
   A wrong URL or hash makes the initContainer fail and the new pod never starts (the old pod keeps serving, see rollout notes).
