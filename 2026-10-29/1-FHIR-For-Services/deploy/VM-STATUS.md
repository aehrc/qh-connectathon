# Track 2 — VM deployment status & handover (2026-09-29)

Where the deployment experiments stand on `aehrc-qh-connectathon-track-2.it.csiro.au`,
what's proven, the current blocker, and how to resume.

## Docker on this VM — known limitation (do not fight it)

Docker/runc **cannot start containers** on this CIS/USG-hardened VM:
`runc create failed: ... fork/exec /proc/self/fd/6: permission denied`.

Systematically ruled out (all tested this session): apparmor (`apparmor=unconfined` still fails),
seccomp (`seccomp=unconfined` still fails), docker `exec-root` on an exec-capable path,
`vm.memfd_noexec` (=0), kernel lockdown (none), and `noexec` on `/run` **and** `/proc` (both
remounted `exec` — docker still failed). There are **no apparmor/seccomp/audit denials** logged.
So it is a deep runc-1.3 × hardened-kernel incompatibility, not a flippable config.

**Decision: do not use docker on this VM.** It isn't needed —
- **microk8s (containerd) works** and is the deployment path that matters (Stage 1 → EKS). Its
  runc invocation tolerates this kernel's hardening; docker's does not.
- The event target is **AWS EKS**, where these CIS-image quirks don't apply.
- The docker-compose path (Stage 0) is superseded by microk8s here.

`deploy/fix-docker-noexec.sh` (exec-root) and the `/run`+`/proc` remounts did **not** fix it;
those mount changes are non-persistent (a reboot restores CIS noexec). If docker is ever truly
needed on such an image, the likely remaining levers are runc's `RUNC_DMZ`/`memfd` behaviour or a
kernel/ptrace hardening control — out of scope; use containerd/microk8s instead.

## TL;DR

> **UPDATE — fhir-frog test PASSES (2026-09-29):** end-to-end proven on the live microk8s stack,
> **without docker**. Seeded a conformant HCPD Organization+Location+HealthcareService (Balmain)
> into the directory server (`deploy/seed/hcpd-balmain.json`), adapted the Sparked Scenario-1 Step-1
> TestScript (`deploy/frog-tests/scenario1/step1/`), built + ran **frog-runner** on the VM (Java 17
> + Maven), pointed at the **external** directory (`serverUrl=http://localhost:18081/fhir`) → run
> COMPLETED, result **pass**, "All tests passed". Passing an explicit `serverUrl` avoids
> frog-runner's docker-managed backend (which would fail here) — use external server always on this VM.


> **UPDATE 2026-09-29 (later):** microk8s Stage 1 now **also verified** after (a) the snapd
> reinstall fixed snap-confine and (b) the VM was resized to **8 vCPU** (2 vCPU caused
> Insufficient-cpu scheduling failures + slow HAPI boots). Both HAPI servers reach 1/1 in the
> `track2` namespace; **HCPD loaded (28 StructureDefinitions) and `$validate` enforces the
> profiles on the k8s directory server** — same result as compose. Remaining caveat: **docker/runc
> is still broken by the apparmor/USG issue** (only snap-confine was fixed by the snapd reinstall),
> so the docker-compose path is down — but microk8s uses containerd and is unaffected. To fix
> docker too: reload its apparmor profile (`sudo aa-status | grep docker`; likely
> `sudo systemctl reload apparmor && sudo systemctl restart docker`, or reinstall the
> apparmor/docker profile the same way as snapd).


- **Docker-compose stack (Stage 0): WORKS — proven.** Both HAPI servers ran; the **HCPD IG
  loaded (28 StructureDefinitions) and `$validate` enforced the HCPD profiles**. This answered
  the key question: **the HCPD IG runs on HAPI** (standard REST; no special ops for the core path).
- **microk8s (Stage 1): manifests validated & applied** (all 14 resources into the `track2`
  namespace, pods scheduled, PVC bound, DB + seed ran) — but not completed.
- **Current blocker: a host-level apparmor fault** on the VM stops **both** runtimes (snap/microk8s
  *and* docker/runc) from starting containers. Introduced around the `microk8s stop/start` + reboot.
  This is a VM/OS image issue, not our manifests.
- **Event target: AWS EKS** (DiSP is an optional intermediate rung; EKS is the real host). Next real
  k8s work is **Helm/Flux → EKS**, not more microk8s-on-this-VM.

## What's proven (keep)

- Two-HAPI + Postgres layout works **with the required Postgres dialect**
  `SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgres94Dialect`
  (without it HAPI defaults to H2 dialect and crashes on Postgres DDL — `seq_resource_type`).
- **HCPD packaging:** not on public registries and HAPI has no runtime `$install`; load by
  **extracting the CI-build tarball and PUTting its conformance resources** (28 SD + ValueSets +
  CodeSystems loaded cleanly). `$validate` against `hcpd-organization` returned the correct
  HCPD-required errors (ABN identifier slice, active, address).
- HCPD package is **profiles-only (no examples)** → conformant instances must be authored for seeding.
- All fixes are committed in `deploy/` (install.sh + k8s manifests carry the dialect; k8s uses the
  microk8s registry for the referrer image).

## Current blocker (apparmor)

Symptoms: `microk8s kubectl` →
`snap-confine has elevated permissions and is not confined but should be`;
`docker compose up` → `runc create failed: unable to start init: fork/exec /proc/self/fd/6:
permission denied`.

Root cause **(confirmed via research)**: this is the known Ubuntu 24.04 snap-confine confinement
error, and on this VM it is caused by **USG / CIS hardening** (the CSIRO image is hardened).
USG modifies `/etc/apparmor.d/usr.lib.snapd.snap-confine.real`, which breaks the snap-confine
apparmor profile so it no longer loads → snap-confine sees itself as unconfined and refuses to run
→ this cascades to **docker/runc** too (both use apparmor), so no container starts. A reboot does
NOT fix it because the altered *profile file* is the problem, not runtime state. Related context:
Ubuntu's CVE-2026-3888 snapd hardening makes snap-confine insist on confinement.

Refs: snapcraft forum "snap-confine elevated permissions error after using USG" (t/40876);
Ubuntu CVE-2026-3888 advisory.

### Fix (CONFIRMED — needs sudo)
Restore the snap-confine apparmor profile that USG altered, by reinstalling snapd:
```bash
sudo apt install --reinstall -o Dpkg::Options::="--force-confask,confnew,confmiss" snapd
```
This does not break USG/CIS auditing (per the forum thread). Then verify:
```bash
sudo aa-status | grep -c snap-confine     # expect > 0
docker run --rm hello-world               # runc should start a container again
```
If it recurs after a future `usg fix` run, re-apply the reinstall.

### Restore the compose stack (once apparmor is fixed)
```bash
ssh track2-vm
cd ~/track2-stack
docker compose --env-file .env up -d
# then re-load HCPD (volumes persist, but if the directory DB was reset):
#   see deploy/README.md — extract build.fhir.org/ig/AuDigitalHealth/HCPD/package.tgz and PUT its
#   StructureDefinition/ValueSet/CodeSystem to http://localhost:8081/fhir
```
**Also add `restart: unless-stopped`** to the compose services so a reboot doesn't drop the stack
(the reboot is what lost it this time).

## Resume plan (next session)

1. **Fix apparmor** on the VM (above) — or rebuild the VM from an image where snap/docker work.
2. **Restore compose**, re-verify HCPD + `$validate`.
3. **Develop the fhir-frog test** against the live compose stack (Scenario 1, starting with Step 1
   HCPD discovery) — reusing `sparked-testing-2026-07-08` TestScripts; author conformant seed
   instances first (package is profiles-only). See `Deployment-Design.md` §5.
4. **Helm/Flux → AWS EKS** for the event host (the real target): HAPI + Postgres as HelmReleases,
   our Kustomize base as a Flux Kustomization, `overlays/aws` (ALB + ACM TLS + gp3, sized ~16 GB /
   4 vCPU for 35–40 users). microk8s Stage 1 has served its purpose (manifests validated).

## VM facts (for reference)

- Ubuntu 24.04, 16 GB RAM / 2 vCPU (bump CPU before load test), snap + docker installed.
- Disk: added a 40 GB LVM disk (`/dev/sdb` → `vg_local`), grew `/var` 5→25 GB (microk8s containerd
  storage). This fixed the earlier DiskPressure taint.
- `sue005` is in `docker` + `microk8s` groups.
- SSH: `ssh track2-vm` (config alias; user sue005, key id_ed25519).
