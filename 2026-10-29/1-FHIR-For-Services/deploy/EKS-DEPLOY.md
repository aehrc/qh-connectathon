# Track 2 — GitOps deploy path (local → DiSP → AWS EKS)

Same Kustomize base promoted through three overlays; DiSP and EKS are driven by Flux.

```
deploy/k8s/
  base/                 env-agnostic: ns, config(TX_URL), Postgres+PVC, 2 HAPI servers
                        (with Postgres dialect), referrer, seed Job, nginx Ingress
  overlays/
    local/              microk8s on the VM   (Stage 1 — VERIFIED: HCPD loads, $validate, frog 6/6)
    disp/               DiSP internal test    (Stage 2 — NEXT)
    aws/                AWS EKS (event host)  (Stage 3 — ALB + ACM + gp3, prod sizing)
deploy/flux/
    track2-disp.yaml    Flux GitRepository + Kustomization -> overlays/disp
    track2-aws.yaml     Flux GitRepository + Kustomization -> overlays/aws
```

Render any overlay: `kustomize build deploy/k8s/overlays/<env>`.

## Stage 2 — DiSP (internal testing, next)

DiSP runs the Flux/Kustomize GitOps pattern (agentk connected to GitLab), like
`disp-gitlab-runner`. No cloud keys needed.

**Before deploy — confirm with the DiSP admin and edit `overlays/disp/kustomization.yaml`:**
1. **Ingress class + host** — set the real DiSP host (replaces `track2.REPLACE-WITH-DISP-HOST`);
   confirm DiSP's ingress controller/class matches the base Ingress (adjust `ingressClassName` if
   not nginx `public`).
2. **StorageClass** — the base PVC uses the cluster default; confirm DiSP has one (or add a
   `storageClassName` patch).
3. **Referrer image** — the overlay points at
   `registry.gitlab.com/australian-e-health-research-centre/patient-referral:latest`; push the
   Patient-Referral image there (or set a registry DiSP can pull).
4. **DB secret** — replace the literal with a sealed/SOPS secret.

**Apply** (Flux):
```bash
kubectl apply -f deploy/flux/track2-disp.yaml     # into flux-system (or DiSP's Flux ns)
# Flux then reconciles overlays/disp from main on every push.
flux get kustomization track2-disp                # watch it go Ready
```

**Post-deploy (same as verified locally):**
- Create the directory DB (`hapi_dir`) — the seed Job assumes both HAPI servers; run the
  `createdb` step (see `k8s-install.sh`) or add an initdb.
- Load HCPD into the directory server (tarball PUT — not on registries; see `frog-tests/README`).
- Run the frog suite against the DiSP-exposed servers (external `serverUrl`).

## Stage 3 — AWS EKS (event host, later — needs cloud keys)

`overlays/aws` adds: **ALB ingress** (`ingress-alb.yaml`) with **ACM TLS**, **gp3** default
StorageClass (`storageclass-gp3.yaml`), and **production sizing** (`patch-sizing.yaml`, `-Xmx3g`,
1 CPU / 3–4 Gi per HAPI for 35–40 users).

**Cluster prerequisites:** AWS Load Balancer Controller, aws-ebs-csi-driver, and nodes sized for
the workload (2 HAPI × ~4 Gi + Postgres + referrer + headroom → ~16 GB across the node group).

**Before deploy — edit `overlays/aws/`:**
1. ACM **certificate ARN** + **host** in `ingress-alb.yaml` (Track 2 domain, infra issue #13).
2. Referrer **ECR** image ref in `kustomization.yaml` (`images:`).
3. DB secret via **Secrets Manager / External Secrets**, not the literal.

**Apply** (Flux): `kubectl apply -f deploy/flux/track2-aws.yaml`.

> Note the CIS-hardening caution: this VM's docker/runc broke under USG hardening (see
> `VM-STATUS.md`). EKS-optimized AMIs are fine, but if the node AMI is CSIRO-hardened, confirm
> containerd/runc start containers before relying on it.

## Status

- **local (microk8s): DONE & verified** — HCPD-on-HAPI, `$validate`, full Scenario-1 frog suite pass.
- **disp: manifests + Flux ready**, validated with `kustomize build` (14 resources). Awaiting DiSP
  admin details (ingress/storage/registry) to deploy.
- **aws: manifests + Flux ready**, validated (15 resources incl. ALB + gp3). Awaiting cloud keys.
