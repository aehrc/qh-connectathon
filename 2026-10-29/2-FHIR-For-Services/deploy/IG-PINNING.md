# IG pinning (decision D3: pin all to concrete versions)

Investigated 2026-10-19, read-only against the live DiSP namespace `aehrc-qh-connectathon-track-2`
and public registries. Tarballs were fetched into a scratch dir, inspected with `tar -t` /
`tar -xzO package/package.json` only, and copies placed in `deploy/ig-packages/` (2.3 MB total,
checksums in `deploy/ig-packages/SHA256SUMS`).

## 1. What is live today

| Server | HAPI image (live digest) | IG env |
|---|---|---|
| `directory` | `hapiproject/hapi:latest` -> `sha256:d7f38d3676900b07e8a7d3500426eaf8d90ea9ced9a6726416f080f68e230fb0` (pullPolicy Always) | HCPD `26.0.0`, `packageUrl=https://build.fhir.org/ig/AuDigitalHealth/HCPD/package.tgz`, `fetchDependencies=false` |
| `fhir` | same digest | `hl7.fhir.au.ereq` `1.0.1` by registry name/version (no packageUrl), R5 excludes; AU Base/Core come in as transitive deps from packages.fhir.org at boot |

The HAPI image itself is also floating (`:latest` + `Always`). Out of scope for this task, but it is the
same class of risk: pin to the digest above (or a release tag) in 20-fhir.yaml.

## 2. Findings per package

| Package | Concrete version | Where | sha256 of fetched tarball | Notes |
|---|---|---|---|---|
| `au.gov.digitalhealth.fhir.hcpd` | `26.0.0` (version label only; contents are a moving CI build, see below). CI build stamp `20260908231611` | Not on packages.fhir.org (404/empty). Only `build.fhir.org/ig/AuDigitalHealth/HCPD/package.tgz` (= `.../branches/main/package.tgz`, identical bytes) | `5daca5dac8d5a83055abd88f92a38c491084b037a4fdcebaca0143a07ebe2413` (296,337 B, 118 members) | Floating: label `26.0.0` is reused by every CI rebuild. The qas.json build index shows the last main build is 2026-09-08 23:16 UTC, which predates the live pods (created 2026-09-29), so this tarball is almost certainly the one currently loaded (cannot prove byte equality; the pod does not retain the file). A frozen sibling exists (`HCPD-Snapshot-26.0.0-HL7AU-Connectathon-Aug-25-26`, branch main, build `20260825022306`, sha256 `9166b953d4017243729cba5c562032621bce268379faab8807a2e5aee615cf12`, 116 members) but it is older and was NOT what we validated against, so do not switch to it without re-running the frog tests. GitHub has no HCPD releases (tags only `release-0.2.0-preview`, `release-0.3.0-preview`). |
| `hl7.fhir.au.base` | `6.0.0` | packages.fhir.org (`https://packages.fhir.org/hl7.fhir.au.base/6.0.0`), registry versions are immutable | `dfafe7d6891b784b610c393a4d65ab81f4bfc9093eabdd061c164b7e53437151` (830,716 B) | Required by HCPD, AU Core, eReq, radiology-referral (`sushi-config.yaml`). Newer `6.1.x-draft` / `7.0.0-ballot1` exist; do not use. |
| `hl7.fhir.au.core` | `2.0.0` | packages.fhir.org | `e202166028f370013a494b64edda891cedc021b6b85fae0fd2782812f5fb64cf` (603,338 B) | Depends on `au.base 6.0.0`, `uv.smart-app-launch 2.2.0`, `uv.ipa 1.1.0`. |
| `hl7.fhir.au.ereq` | `1.0.1` (already pinned) | packages.fhir.org | `e7ee7dab9a6ef18612720bba35af32bb883b8dd727e0feba6fb47be081f09d05` (451,961 B) | Depends on `au.base 6.0.0`, `au.core 2.0.0`, `uv.ips 2.0.1`, terminology.r4 7.3.0, extensions.r4 5.3.0. |
| AU Provider Directory: `hl7.fhir.au.pd` | HCPD declares `"hl7.fhir.au.pd": "current"` (unpinned, resolves to the CI build `2.1.0-ci-build`, which in turn depends on `au.base 4.1.0`, i.e. a conflicting base). Registry latest = `2.0.1` (R4 4.0.0, 38 members, 2019 content) | packages.fhir.org has `2.0.1` | `63adab64c16b7a3ece89793bc7fa380685a8f0b36a2f08163432b2fad4ba9e00` (108,433 B) | There is no `au.digitalhealth.pd` package; the name is `hl7.fhir.au.pd`. **Recommendation: do not install it.** Live runs with `fetchDependencies=false`, so it is not loaded today and the frog/directory tests pass without it. Installing `2.0.1` or `current` risks pulling an old `au.base` and clashing with 6.0.0. The `2.0.1` tarball is vendored for reference only. |
| `au.csiro.aehrc.referral` (radiology-referral) | `0.1.0` (`ig/sushi-config.yaml`) | **Not published anywhere.** `build.fhir.org/ig/aehrc/radiology-referral/package.tgz` and `.../branches/main/package.tgz` both 404; the repo is not in build.fhir.org's qas.json; no GitHub releases, tags or workflows; `aehrc.github.io/radiology-referral/package.tgz` 404 | n/a | Must be built by us and then treated as an artifact we own (see 4). A scratch build was attempted (sushi + publisher.jar) and failed on a corrupt `~/.fhir/packages/hl7.terminology.r4#7.4.0` cache entry on this workstation, so no tarball was produced. Needs `rm -rf ~/.fhir/packages/hl7.terminology.r4#7.4.0` (or build in CI) and then `_genonce.sh`; the tarball is `output/package.tgz`. Also note `ig/sushi-config.yaml` calls itself `0.1.0` with `status: draft`; cut a git tag when frozen. |

Transitive packages not vendored (all immutable on packages.fhir.org, and large): `hl7.fhir.r4.core 4.0.1`,
`hl7.terminology.r4` (`7.0.1` for au.base/core, `7.3.0` for eReq/HCPD), `hl7.fhir.uv.extensions.r4` (`5.2.0` / `5.3.0`),
`hl7.fhir.uv.ips 2.0.1`, `hl7.fhir.uv.smart-app-launch 2.2.0`, `hl7.fhir.uv.ipa 1.1.0`, `hl7.fhir.uv.bulkdata 3.0.0`.
The `fhir` server fetches the ones it needs from packages.fhir.org at boot; that registry is the only remaining
online dependency after vendoring (see 3, option F).

## 3. Vendoring options and tradeoffs

How HAPI consumes a package: `HAPI_FHIR_IMPLEMENTATIONGUIDES_<KEY>_{NAME,VERSION,PACKAGEURL,INSTALLMODE,FETCHDEPENDENCIES}`.
With `PACKAGEURL` HAPI downloads that URL over HTTP(S). I have NOT verified that `file://` is accepted by the
`hapiproject/hapi` build in use, so do not rely on it without a test.

| Option | Mechanism | Pros | Cons |
|---|---|---|---|
| A. Commit tarballs in git (done, `deploy/ig-packages/`) | source of truth + checksums | Reproducible, reviewable, 2.3 MB, survives any upstream outage or change | Does not by itself make HAPI read them; needs B or C to serve |
| B. In-cluster static server | tiny `nginx` Deployment+Service `ig-packages`; one ConfigMap per tarball using `binaryData` (limit 1 MiB per ConfigMap; largest is 830 KB so it fits, but it is close for au.base); HAPI `PACKAGEURL=http://ig-packages:8080/<file>.tgz` | Fully offline within the namespace, no image rebuild, same manifest on DiSP and EKS | New workload; ConfigMaps hold binary blobs (etcd size, ugly diffs); au.base nearly at the limit. A PVC + initContainer that copies from a pinned URL is the alternative |
| C. Pinned raw URL in git host | `PACKAGEURL=https://gitlab.com/<group>/<repo>/-/raw/<commit-sha>/deploy/ig-packages/<file>.tgz` (or GitHub raw at a commit SHA) | No new workload; content immutable because URL is by commit SHA | Still an internet dependency (but a far more reliable one than build.fhir.org CI); repo must be readable by the cluster unauthenticated |
| D. GitLab/GitHub Package Registry or S3 object | upload tarballs once, set `PACKAGEURL` to that | Immutable, can be public-read, works from both DiSP and EKS | Extra credential/bucket setup; the S3 variant touches AWS, which is out of scope for this agent |
| E. Bake into a derived HAPI image | `COPY` the tgz and use an init script / `file:` path | No runtime fetch at all | Must build and push an image; unverified file: support; image is also where the digest pin belongs |
| F. Leave registry packages by name/version | AU Base/Core/eReq via packages.fhir.org | Zero work; versions are immutable | Registry is an outage point at boot; mitigate by starting pods early and not restarting during the event |

**Recommendation.** Keep A (already done). Use **C** for the two things that are not on the registry
(HCPD and radiology-referral) as the least-effort fix, since the event's real risk is build.fhir.org rebuilding
the HCPD tarball under us or 404ing the referral one. If C is unacceptable (private repo), use **B**. Keep
AU Base/Core/eReq on the registry by exact version (option F) for the `fhir` server, since the transitive
closure is large and the registry is immutable; optionally also set `PACKAGEURL` for eReq to the vendored copy
and accept that dependencies still come from the registry. Whichever is chosen, do one boot test on a scratch
namespace or the VM (not the live cluster) with outbound to build.fhir.org blocked, and check
`GET /fhir/StructureDefinition?url:below=http://digitalhealth.gov.au/fhir/hcpd/StructureDefinition&_summary=count`
returns the same count as live before and after.

Verify before every deploy: `cd deploy/ig-packages && sha256sum -c SHA256SUMS`.

## 4. Proposed env var changes for `deploy/k8s/base/20-fhir.yaml`

Placeholders: `<RAW>` = the base URL chosen under option C (commit-SHA raw URL) or `http://ig-packages:8080`
for option B. Not applied; the file is owned by another agent.

`directory` Deployment (replace the HCPD block):

```diff
-            - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_HCPD_PACKAGEURL, value: https://build.fhir.org/ig/AuDigitalHealth/HCPD/package.tgz }
+            # Pinned: CI build 20260908231611, sha256 5daca5da...2413 (deploy/ig-packages/SHA256SUMS)
+            - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_HCPD_PACKAGEURL, value: "<RAW>/au.gov.digitalhealth.fhir.hcpd-26.0.0-ci20260908231611.tgz" }
```

(NAME, VERSION `26.0.0`, INSTALLMODE and `FETCHDEPENDENCIES=false` stay unchanged; keep false so the unpinned
`hl7.fhir.au.pd current` dependency is never resolved.)

`fhir` Deployment, AU eReq (already concrete; optional vendored URL, otherwise unchanged):

```diff
             - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_AUEREQ_VERSION, value: "1.0.1" }
+            # optional: - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_AUEREQ_PACKAGEURL, value: "<RAW>/hl7.fhir.au.ereq-1.0.1.tgz" }
```

`fhir` Deployment, radiology-referral (enable only after the tarball is built, vendored as
`deploy/ig-packages/au.csiro.aehrc.referral-0.1.0.tgz` and added to SHA256SUMS). The existing commented block
has the right NAME and VERSION; only PACKAGEURL changes:

```diff
-            # - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_REFERRAL_NAME, value: au.csiro.aehrc.referral }
-            # - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_REFERRAL_VERSION, value: 0.1.0 }
-            # - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_REFERRAL_PACKAGEURL, value: https://build.fhir.org/ig/aehrc/radiology-referral/package.tgz }
-            # - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_REFERRAL_INSTALLMODE, value: STORE_AND_INSTALL }
+            - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_REFERRAL_NAME, value: au.csiro.aehrc.referral }
+            - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_REFERRAL_VERSION, value: "0.1.0" }
+            - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_REFERRAL_PACKAGEURL, value: "<RAW>/au.csiro.aehrc.referral-0.1.0.tgz" }
+            - { name: HAPI_FHIR_IMPLEMENTATIONGUIDES_REFERRAL_INSTALLMODE, value: STORE_AND_INSTALL }
+            # leave FETCHDEPENDENCIES at its default (true) so au.base/au.core/au.ereq resolve; already satisfied by AUEREQ above
```

Both servers (image pin, applies to `fhir`, `directory`):

```diff
-          image: hapiproject/hapi:latest
+          image: hapiproject/hapi@sha256:d7f38d3676900b07e8a7d3500426eaf8d90ea9ced9a6726416f080f68e230fb0
```

## 5. Caveats and open points

- HAPI loads each IG only once per DB: changing `PACKAGEURL` for an already-installed `name#version` may be a
  no-op (HAPI skips "already installed"). The vendored HCPD tarball is believed identical to the live one, so
  this is harmless for the existing DB; a fresh DB (reset/reseed, EKS) will install it cleanly.
- Not verified: byte-identity of live HCPD to the vendored copy; `file:` URL support; HAPI behaviour with
  `PACKAGEURL` pointing at an in-cluster HTTP server (expected to work as it is plain HTTP GET).
- radiology-referral has no tarball until someone builds it; D3 for that IG reduces to "tag the `ig/` repo and
  vendor the built `package.tgz`".
- The live `directory` server never loads AU Base/Core (fetchDependencies=false); validation against HCPD
  profiles that derive from AU Core relies on whatever is already in the DB or on the remote terminology/validation
  paths. Frog tests pass today, so left as is.

## 6. radiology-referral built and load-tested (2026-10-19)

- **Built** from `ig/` (`d200cdd`) with the IG Publisher in a scratch copy; tarball vendored as
  `ig-packages/au.csiro.aehrc.referral-0.1.0.tgz` (79,603 B; 5 profiles + 16 examples). The publisher's QA reports
  6 errors, all the same environmental one (r4.ontoserver returns an ambiguous version for the ISO 3166
  CodeSystem used in `jurisdiction`), none in the IG content. `package.json` `url` is the scratch path; harmless.
- **Also vendored** (needed so HAPI's `$validate` can resolve the AU profiles and extensions):
  `hl7.fhir.uv.extensions.r4-5.3.0.tgz`, `hl7.terminology.r4-7.0.1.tgz`.
- **Load test** (scratch HAPI at the live image digest, tarballs over plain HTTP, no other network needed for the
  packages): all six load. HAPI does **not** fetch dependencies for IGs given by `packageUrl`, so **every package
  must be listed explicitly** (`FETCHDEPENDENCIES=false`), in this order: terminology.r4, extensions.r4, au.base,
  au.core, au.ereq, referral. With only ereq + referral, 92 of the seed's resources failed with "Unknown profile
  au-ihi / au-medicarecardnumber ...". The live `fhir` server currently has only the 21 eReq profiles, so
  the live referral server cannot validate AU Core Patients either.
- **Result with the full set:** `seed/validate-referrals.py` -> 182 resources clean, 44 Task group resources
  fail only on a HAPI built-in-table quirk (`v2-0203#PGN` in 'Order Identifier Type'; HAPI's built-in v2-0203 lacks
  PGN and shadows the package copy). The HL7 validator accepts the same data (see `seed/referrals/REVIEW.md`).
- **Config bug found:** `k8s/base/01-config.yaml` had `TX_URL=https://tx.ontoserver.csiro.au/fhir`; decision B1 is
  `https://r4.ontoserver.csiro.au/fhir`. Fixed in the repo (not yet applied to DiSP).
- **Hosting decision (C vs B):** `aehrc/qh-connectathon` is **public**, so option C works: serve the tarballs as
  `https://raw.githubusercontent.com/aehrc/qh-connectathon/<commit-sha>/2026-10-29/2-FHIR-For-Services/deploy/ig-packages/<file>`.
  Not wired into `20-fhir.yaml` yet: it needs the SHA of the commit that contains the tarballs, i.e. a push.
