# Track 2 on EKS: plan (2026-10-19)

Supersedes the standalone `overlays/aws` approach (kept for reference). The shared EFIQ cluster already provides what that
overlay tried to create, so Track 2 only adds a workload to it.

## What already exists (efiq-configuration / efiq-flux, account 251783195529, ap-southeast-2)

- EKS Auto Mode cluster brought up and torn down by `efiq-configuration/scripts/up.sh` / `down.sh` (currently DOWN).
- Shared ALB (IngressGroup `efiq`), default IngressClass `alb` with the wildcard ACM certificate `*.efiq.jgsuess.dev`.
- external-dns (Route 53, zone `efiq.jgsuess.dev`), default gp3 StorageClass, Flux v2.
- Decision D12: several tracks share the cluster; hostnames are one label under the root (`ris.efiq.jgsuess.dev`).

## What this repo adds

`deploy/k8s/overlays/efiq`: namespace `track2`, ingress on the shared ALB with host from `hostname.yaml` (the only
place the name lives; placeholder `track2.efiq.jgsuess.dev`), per-Service ALB health checks, sized HAPI servers (3 GB heap; 4 CPU / 5 Gi each), the "test data only"
banner proxy, HAPI public addresses. Images come from Docker Hub (Patient-Referral, nginx, HAPI at a pinned digest); IG
packages come from this public repo by commit SHA. Nothing needs ECR or ACM changes.

## Flux wiring (to add to efiq-flux, as an MR; not applied)

`apps/track2/source.yaml`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata: { name: qh-connectathon, namespace: flux-system }
spec:
  interval: 10m
  url: https://github.com/aehrc/qh-connectathon
  ref: { commit: <SHA OF THE RELEASE COMMIT> }   # pin; bump deliberately
```

`clusters/efiq/infrastructure/apps-track2.yaml` (beside `apps.yaml`):

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata: { name: apps-track2, namespace: flux-system }
spec:
  interval: 10m
  prune: true
  sourceRef: { kind: GitRepository, name: qh-connectathon }
  path: ./2026-10-29/2-FHIR-For-Services/deploy/k8s/overlays/efiq
  timeout: 15m
```

The existing `apps` Kustomization only covers `./apps/ris-tutorial`, so Track 2 gets its own, and the RIS tutorial is untouched.

## Bring-up sequence (all human gates, per the efiq checkpoint)

1. Merge the open efiq MRs (flux !1, configuration !1); review and merge the Track 2 MR above.
2. `scripts/up.sh` (dry run first): vpc, eks, flux, external-dns association. About 12 min; about US$8-12 per day.
3. Flux reconciles `apps-track2`. HAPI boots in about 2.5 min on a fresh database (the IG packages come from GitHub raw by SHA).
4. Load the seeds against the public URL (idempotent; the directory seed needs the referral base for its Endpoints):
   `DIRECTORY_URL=https://track2.efiq.jgsuess.dev/directory/fhir ./seed/load-directory.sh`
   `FHIR_BASE=https://track2.efiq.jgsuess.dev/referral/fhir ./seed/load-referrals.sh`
5. Warm up, then verify: `BASE_URL=https://track2.efiq.jgsuess.dev ./smoke/smoke.sh` (28/28 expected), then
   `python3 -I loadtest/loadtest.py --base https://track2.efiq.jgsuess.dev --users 40`.
6. Freeze: record the commit SHA and image digests in the Flux GitRepository pin.

## Things to decide or watch

- **Hostname and DNS root** (decision F1, open). The root is either `jgsuess.dev` (today's `efiq.jgsuess.dev` zone and wildcard
  certificate) or `efiq.org`. Track 2 is ready for either: the public hostname is a single value in
  `overlays/efiq/hostname.yaml`, copied by kustomize `replacements` into the ingress host, the external-dns annotation and both
  HAPI public addresses (verified by rendering with another value). Changing the root is NOT a change in this repo: it needs the
  new Route 53 zone and wildcard ACM certificate in efiq-configuration (persistent layer, human gate), the new
  `certificateARNs` in efiq-flux's `IngressClassParams`, and external-dns pointed at the zone. Nothing else depends on the name
  (the directory Endpoints are written from the URL you pass to `load-directory.sh`; DiSP stays on `*.dw.csiro.au`).
  D12 asks for one label under the root and warns against track-specific names, for example `fhir-services.<root>`.
- **Teardown date.** The efiq checkpoint sets `EFIQ_TEARDOWN_AFTER=2026-11-01`; our plan (G4) is to keep it up for up to a week
  after the event and export the data first. Reconcile the two.
- **Cost / timing.** Bring-up around 26 Oct saves about US$100 (efiq notes). That is the same day as our freeze, so do a full
  rehearsal on DiSP first and keep DiSP as the warm standby (G3).
- **ALB idle timeout** is set to 120 s in the ingress (default 60 s), because the first `$validate` after a restart can take
  longer while HAPI builds its validation cache.
- **Shared ALB group.** Track 2 and RIS share one ALB; a bad ingress change on one can affect the other. Review ingress edits.
- **Docker Hub pulls** from the cluster are unauthenticated (rate limited per source IP); with a handful of images this is fine,
  but pull the nginx, Patient-Referral and HAPI images once during the rehearsal.
- **Database** (Postgres, 5 Gi gp3 PVC) is single-node and not backed up; export the data (FHIR `$export` or the seed scripts)
  before teardown (G4).
- Not yet built: the frog-runner UI (#49, decision E3) and Bulk `$export` on the directory (C4).
