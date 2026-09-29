# DiSP deploy runbook — Track 2 (first cloud target)

Deploys the Track 2 stack to a **DiSP namespace** via DiSP's Flux. DiSP provides the platform
automation (Contour ingress/LB, cert-manager TLS, auto DNS under `*.dw.csiro.au`), so we only
declare workloads + an Ingress.

## DiSP model (why the manifests look the way they do)

Per the disp-flux docs, DiSP's Flux is **per-object impersonation, namespace-scoped**:
- every `Kustomization` **must** set `spec.serviceAccountName` (else it runs as `default` = zero
  RBAC = Forbidden);
- RBAC ceiling is namespace-scoped **`admin`** via a **RoleBinding** (never ClusterRoleBinding /
  cluster-admin); no `flux-system` access; no cross-namespace references.

So each tenant namespace gets a **complete, independent bootstrap** — ServiceAccount + RoleBinding
+ GitRepository + Kustomization, all in the tenant namespace. That is exactly
`deploy/flux/track2-disp.yaml`.

## Prerequisites (admin-confirm checklist)

Confirm these with the DiSP admin, then fill them in:

| # | Item | Where it goes | Default assumed |
|---|------|---------------|-----------------|
| 1 | **Namespace** name (DiSP-assigned) | replace `TRACK2_NS` in `flux/track2-disp.yaml` **and** `overlays/disp` `namespace:` | — |
| 2 | **Contour IngressClass** name | `overlays/disp` ingress patch `ingressClassName` | `contour` |
| 3 | **Host** under the wildcard | `overlays/disp` ingress `host` | `aehrc-qh-connectathon-track-2.dw.csiro.au` |
| 4 | **cert-manager ClusterIssuer** name | `overlays/disp` `cert-manager.io/cluster-issuer` | `letsencrypt` |
| 5 | **StorageClass** name | base PVC (add `storageClassName` patch if not default) | cluster default |
| 6 | **Registry** for the referrer image | `overlays/disp` `images:` | GitLab registry |
| 7 | **Repo source auth** — GitRepository + fine-grained PAT, or OCIRepository + Deploy Token | `repo-auth` Secret (option A) | GitHub PAT |

## Steps

1. **Set the namespace** everywhere:
   ```bash
   NS=<disp-namespace>
   sed -i "s/TRACK2_NS/$NS/g" deploy/flux/track2-disp.yaml
   sed -i "s/^namespace: track2/namespace: $NS/" deploy/k8s/overlays/disp/kustomization.yaml
   # also update the base namespace resource, or drop namespace: from base and set only in overlay
   ```

2. **Create the source-auth secret** (option A — GitHub read-only fine-grained PAT):
   ```bash
   kubectl -n $NS create secret generic repo-auth \
     --from-literal=username=<gh-user> \
     --from-literal=password=<fine-grained-PAT-with-repo:read>
   ```
   (Option B: push an OCI artifact of `overlays/disp` and use OCIRepository + a GitLab Deploy Token.)

3. **Push the referrer image** to the registry DiSP can pull (item 6), matching the `images:` ref.

4. **Apply the Flux bootstrap** (into the tenant namespace):
   ```bash
   kubectl apply -f deploy/flux/track2-disp.yaml
   ```

5. **Watch reconciliation**:
   ```bash
   kubectl -n $NS get gitrepository,kustomization
   kubectl -n $NS get pods,ingress
   flux -n $NS get kustomization track2      # if the flux CLI is available
   ```

6. **Post-deploy (same as verified on microk8s)** — the seed Job assumes both HAPI servers and the
   directory's second DB:
   - Ensure the `hapi_dir` database exists (add an initdb, or run the `createdb` step from
     `k8s-install.sh` once).
   - Load HCPD into the directory server (CI-build tarball PUT — see `frog-tests/README.md`),
     and load the `radiology-referral` package into the referral server.
   - Seed the conformant HCPD instances (`deploy/seed/hcpd-balmain.json`).

7. **Verify** with the frog suite against the DiSP-exposed URLs (external `serverUrl`):
   `https://<host>/directory/fhir` and `https://<host>/fhir` — run `scenario1/step1` and
   `scenario1-referral` bundles (see `frog-tests/README.md`).

## Notes

- The base carries a `nginx.ingress.kubernetes.io/rewrite-target` annotation (for microk8s);
  Contour ignores it and does prefix routing natively — harmless, but can be removed for tidiness.
- If DiSP disallows the referrer image registry, deploy the two FHIR servers + directory first
  (the core scenario) and add the referrer once a pullable image is available.
- Everything the stack proved on microk8s (HCPD-on-HAPI, `$validate`, frog Scenario-1) should carry
  over unchanged — DiSP just adds real ingress/DNS/TLS.
