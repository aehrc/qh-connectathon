# Services Track — Deployment Design (self-contained stack + external tx, staged)

**Goal:** stand up the radiology-referral scenario as a **self-contained stack** — with a single,
deliberate exception: **terminology is served by an external tx server**. Everything else runs
inside the deployment so it can be tested independently, and the same source promotes unchanged
through: **local k8s → DiSP → AWS (EKS)**.

This mirrors the staging pattern proven by `ris-hl7v2-tutorial` (local `docker compose`, then
DiSP GitOps, then cloud) and the `disp-gitlab-runner` Flux/Kustomize GitOps pattern (a `base`
plus per-environment `overlays`, reconciled by a cluster agent).

---

## 1. Principle: self-contained, except terminology

The scenario as drawn depends on external services — HCPD (provider directory), a terminology
server, and a hosted referrer. We pull the directory and the referrer *inside* the cluster, and
**accept one external dependency: the terminology server (tx)**. Using an external tx avoids
bundling a large terminology image, loading a SNOMED subset, and the licensing overhead of a
public Ontoserver — for a small, well-understood cost (an outbound HTTPS call to the tx).

| Dependency | Approach |
|------------|----------|
| HCPD (Health Connect Provider Directory) | **In-cluster:** a **seeded FHIR server acting as the directory**, profiled against the **HCA Provider Directory IG** (`au.gov.digitalhealth.fhir.hcpd`, canonical `http://digitalhealth.gov.au/fhir/hcpd`). Load its profiles/ValueSets and seed conformant HealthcareService, Location, Organization, Practitioner, PractitionerRole, Endpoint (HPI-O/HPI-I identifiers). Same HAPI in a `directory` partition, or a second HAPI. |
| Terminology (`$expand` / `$validate-code`) | **External tx server** — configured via a single `TX_URL` env var. This is the one accepted external dependency. Point it at a shared Ontoserver (e.g. `https://r4.ontoserver.csiro.au/fhir` or Dion's instance); the referral/validation servers call it for imaging ValueSets and SNOMED codes. |
| patient-referral.onrender.com (referrer) | **In-cluster:** the **Patient-Referral app deployed into the cluster**, pointed at the in-cluster FHIR + directory. |
| SMART auth provider (if used) | Open server by default; optional in-cluster SMART/keycloak only if we choose the secured path. |

Everything except terminology resolves to a service **inside the namespace**. Seed data makes the
directory and sample referrals reproducible; a reset job makes it repeatable between sessions. The
**only egress** is HTTPS to the tx server — so the stack still tests independently of HCPD, QCTS,
and the public referrer, and the tx endpoint is the single thing to allow-list / pre-test.

## 2. Services (the stack)

| Service | Image / basis | Role | Notes |
|---------|---------------|------|-------|
| `fhir` (Referral Server) | `hapiproject/hapi` + `radiology-referral` IG package | Holds ServiceRequest, Task, Schedule, Slot, Appointment; validates against the IG | Load the IG package on startup; enable `$validate`; **remote terminology → `TX_URL`** |
| `directory` | HAPI (seeded) *or* a `directory` partition on `fhir` | Stands in for HCPD | Seeded HealthcareService/Location/Organization/PractitionerRole/Endpoint |
| `referrer` | `mjosborne1/Patient-Referral` (Flask) | The Referrer/Filler UI (browser-core path) | Configured to the in-cluster `fhir` + `directory`, and `TX_URL` for coded typeahead |
| `db` | Postgres | Persistence for the HAPI server(s) | PVC-backed |
| `seed` (Job) | small init/loader | Loads directory + sample patients/referrals | Runs once on deploy; idempotent |
| `reset` (Job/CronJob) | small script | Wipe + reseed between sessions | Manual trigger or scheduled overnight |
| *(ingress)* | Traefik/NGINX/ALB | Single HTTPS entry with path routing | `/` referrer, `/fhir`, `/directory` — avoids CORS, one domain |
| *terminology (external)* | shared Ontoserver / tx | `$expand` / `$validate-code` for imaging ValueSets & SNOMED | **Not deployed** — referenced via `TX_URL`; the one external dependency |

Path-routed single ingress (as the RIS stack does with `/fhir`): one domain, TLS at the edge,
no per-service CORS. Nothing but 443 is exposed inbound; no inbound MLLP (not needed for this
scenario). The only **outbound** dependency is HTTPS to the external tx (`TX_URL`).

## 3. Repository layout (GitOps-ready)

Keep manifests in the repo so the same source promotes across stages — `base` + `overlays`,
exactly like `disp-gitlab-runner`:

```
deploy/
  compose/                 # stage 0 — local docker compose (fast inner loop)
    docker-compose.yml
    .env.example
  k8s/
    base/                  # env-agnostic manifests (Deployments, Services, Jobs, Ingress)
      kustomization.yaml
      fhir.yaml  directory.yaml  referrer.yaml  db.yaml
      seed-job.yaml  reset-cronjob.yaml  ingress.yaml
      config.yaml            # TX_URL + other env (patched per overlay)
    overlays/
      local/               # stage 1 — kind/minikube/k3d (NodePort or localhost ingress)
      disp/                # stage 2 — DiSP: Flux Kustomization + HelmRelease sources, agentk-reconciled
      aws/                 # stage 3 — EKS: ALB ingress, ACM TLS, gp3 StorageClass, sized for 40 users
  seed/                    # fixtures: directory + sample patients/referrals (no terminology load)
  smoke/                   # smoke.sh — brings the stack up and drives the full flow
```

## 4. Staged rollout

### Stage 0 — Local `docker compose` (inner loop)
- `docker compose up -d --wait`; config via env only; single published HTTP port.
- `smoke/smoke.sh`: seed → discover in `directory` → create referral on `fhir` → triage → book →
  track Task to Booked; assert resource counts and `$validate` clean. Exit non-zero on failure.
- Purpose: fast iteration; proves the stack is genuinely self-contained (no network egress).

### Stage 1 — Local Kubernetes (kind / k3d / minikube)
- `kubectl apply -k deploy/k8s/overlays/local`.
- Same images, now as Deployments/Services/Jobs. Validates manifests, seed Job, PVCs, ingress
  routing before any cloud. Run the same `smoke.sh` against the ingress URL.

### Stage 2 — DiSP (GitOps)
- Reuse the `disp-gitlab-runner` pattern: a Flux `Kustomization` pointing at
  `deploy/k8s/overlays/disp`, reconciled by the in-cluster **agentk** connected to GitLab.
- HAPI/Ontoserver via `HelmRelease` where a chart exists; our own services via Kustomize.
- Push to the branch → Flux reconciles → stack updates. No `kubectl` from laptops.
- Proven footprint; good for the dry-run and as a fallback host.

### Stage 3 — AWS EKS (event host)
- `overlays/aws`: **ALB ingress** + **ACM** TLS for the public DNS name (Track 2 domain,
  infra issue #13), **gp3** `StorageClass` for the Postgres/HAPI PVCs, resources sized for
  **35–40 concurrent users** (infra issue #26 load/soak test).
- Same GitOps reconcile model (Flux) or `kubectl apply -k overlays/aws` from CI.
- Teardown after the event (infra issue #28): delete the namespace + release the ALB/ACM/DNS.

## 5. Testing

Two layers, both runnable at every stage against the ingress URL:

### 5a. Functional smoke test (`smoke/smoke.sh`)
Drives the whole story end-to-end (as the RIS tutorial does): seed → discover in `directory` →
create referral on `fhir` → filler triage → book → track the Task to Booked. Asserts resource
counts, `$validate` clean (against the `radiology-referral` IG), and directory search returns the
seeded providers. Exits non-zero on any failure. Runs in CI and before each event day.

### 5b. Conformance testing — fhir-frog / frog-runner
Use **[frog-runner](https://github.com/aehrc/frog-runner)** (IG-agnostic fhir-frog conformance
runner + web UI — "fhir-frog's answer to Inferno") to check the deployed servers against the IGs:

- **Directory server** → the **HCA Provider Directory IG** (does the seeded directory conform to
  the HCPD profiles/search?).
- **Referral server** → the **radiology-referral IG** (and its AU eRequesting / AU Core base).

Mechanism: frog-runner loads fhir-frog TestScripts bundled in an IG package and executes them
against a configured System Under Test, reporting pass/fail. So the flow is:
1. Compile each IG into fhir-frog TestScripts (per the `au-core-compiler` approach), **or** point
   frog-runner at a test bundle / `testPackage`.
2. `POST /api/runs` with `serverUrl` = the in-cluster `/fhir` (and `/directory`) ingress path.
3. Read the pass/fail report; wire it into CI as a gate before promotion (local → DiSP → AWS).

Deploy frog-runner either as a short-lived CI job (Java 17, `mvn spring-boot:run`, hit the SUT)
or as a small in-cluster Deployment for interactive use during the event. It needs no credentials
(pulls `org.fhirfrog:fhir-frog-library` anonymously). This gives us **automated IG conformance**
alongside the functional smoke test, and doubles as a teaching artifact (participants can see
their own bundles pass/fail).

> Open: fhir-frog is an early trial. If the IG→TestScript compile isn't ready for HCPD/radiology-
> referral in time, fall back to `$validate` on the servers (functional) + manual conformance
> review, and keep frog-runner as the stretch.

## 6. How this answers the open decisions / issues

- **Self-contained** removes the hard dependency on HCPD SIT access (#8) and the directory↔server
  linkage (#9) for the *core* path — those become an optional "connect to the real HCPD" stretch.
- **Terminology** (#16) is an **external tx** via `TX_URL` (e.g. a shared Ontoserver / Dion's
  instance). The one external dependency — allow-list and pre-test that single endpoint. No QCTS
  VPN needed for the core path.
- **Hosting** (#21) → EKS; **server URLs** (#11) → the single path-routed domain.
- **Load/soak at 40** (#26), **reset/reseed** (part of #14), **teardown** (#28) are first-class
  in the design (seed/reset Jobs, `aws` overlay sizing).

## 7. Open questions before building

1. **One HAPI or two?** Directory as a separate server vs a partition on the referral server.
   Two servers is cleaner conceptually (mirrors HCPD as a distinct system) at a small resource cost.
2. **Which tx endpoint** for `TX_URL` — a public Ontoserver (e.g. `r4.ontoserver.csiro.au`) vs
   Dion's instance — and confirm it serves the imaging ValueSets/SNOMED the scenario needs, at the
   expected concurrency (40 users), over HTTPS from the cluster.
3. **Booking ownership in Patient-Referral** (#32) — does the app do Slot/Appointment, or is that
   driven via the FHIR API for now?
4. **Secured vs open** — keep open for teaching simplicity, or add in-cluster SMART for the
   security-minded stream (#11/transport)?
5. **frog-runner readiness** — can we compile the HCPD and radiology-referral IGs into fhir-frog
   TestScripts in time (`au-core-compiler` approach), or do we ship `$validate` + manual review for
   the event and treat frog-runner conformance as the stretch?
6. **HCPD IG version/scope** — track `au.gov.digitalhealth.fhir.hcpd` (v26.0.0), and decide which
   profiles/search parameters the seeded directory must support for the discovery step.

*This is a design sketch modelled on the `ris-hl7v2-tutorial` staging and the `disp-gitlab-runner`
Flux/Kustomize GitOps pattern. It is not yet implemented — no manifests are committed here yet.*
