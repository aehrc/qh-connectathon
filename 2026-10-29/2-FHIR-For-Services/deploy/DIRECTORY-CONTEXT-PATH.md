# Directory HAPI under /directory (fix for the /directory 404)

Problem: Contour (DiSP) and ALB (AWS) cannot rewrite paths, so `/directory/...` reached the
directory HAPI unchanged and 404ed (HAPI only served `/fhir/...`).

Fix: the directory HAPI runs with `SERVER_SERVLET_CONTEXT_PATH=/directory` (Spring Boot context path).

## Proof (local docker, hapiproject/hapi:latest, H2, 2026-10-19)
With `-e SERVER_SERVLET_CONTEXT_PATH=/directory`:
- `/directory/fhir/metadata` 200; `/directory/metadata` 404; `/fhir/metadata` 404
- `/directory/` (HAPI UI) 200; `/directory/actuator/health/readiness` 200
- POST Organization -> 201, `Location: http://localhost:PORT/directory/fhir/Organization/1000/_history/1`;
  search bundle `fullUrl`/`self` links also carry `/directory/fhir` (even without `HAPI_FHIR_SERVER_ADDRESS`, derived from the request).
- Control container (no env): `/fhir/metadata` 200 as before.
Not tested: the Postgres + HCPD IG boot, the real ingresses (nothing applied to any cluster).

## Base URLs participants use
| Server | FHIR base |
|---|---|
| Referral | `https://<host>/fhir` (unchanged) |
| Directory | `https://<host>/directory/fhir` (NOT `/directory` or `/directory/metadata`) |
DiSP host: `https://aehrc-qh-connectathon-track-2.dw.csiro.au`. Local: `http://<vm-ip>`. In-cluster: `http://directory:8080/directory/fhir`.

## Manifest changes
- `base/20-fhir.yaml` (directory only): env `SERVER_SERVLET_CONTEXT_PATH=/directory`; readinessProbe path `/fhir/metadata` -> `/directory/fhir/metadata`.
  (Probes would otherwise 404 forever and the pod never goes Ready.) The referral deployment is unchanged.
- `base/50-ingress.yaml` (nginx/microk8s): removed `rewrite-target: /$2` and regex paths; plain `Prefix` paths `/fhir`, `/directory`, `/`.
  The rewrite would have stripped `/directory`. `annotations: {}` is kept so the disp overlay's JSON-patch add still works.
- `overlays/disp`: adds `HAPI_FHIR_SERVER_ADDRESS=https://aehrc-qh-connectathon-track-2.dw.csiro.au/directory/fhir` to directory (so links use https behind TLS termination). Its Contour paths were already plain prefixes.
- `overlays/aws`: patches the `directory` Service with `alb.ingress.kubernetes.io/healthcheck-path: /directory/fhir/metadata`
  (the Ingress-level `/fhir/metadata` health check applies to every backend and would mark directory targets unhealthy).
  The ingress-alb.yaml itself needed no change. UNVERIFIED on EKS Auto Mode that the Service-level override is honoured; if not, set the ingress healthcheck-path to a path valid on all backends or use `alb.ingress.kubernetes.io/success-codes: 200-499`.
  Set `HAPI_FHIR_SERVER_ADDRESS` for aws once the host is known (host is still a placeholder).
- `kustomize build` succeeds for local, disp, aws (checked the rendered env, probes, ingress paths).

## Other files that MUST change (not owned by this task, not touched)
- `base/30-referrer.yaml:25` `PD_SERVER: http://directory:8080/fhir` -> `http://directory:8080/directory/fhir` (otherwise the referrer's directory lookups 404).
- `deploy/install.sh:189` (VM, plain docker) uses the same PD_SERVER; the VM directory container is separate, only change if it also gets a context path.
- Docs/scripts: `deploy/README.md:56`, `deploy/k8s-install.sh:82` print `/directory/metadata` -> `/directory/fhir/metadata`; `deploy/smoke/smoke.sh` set `DIRECTORY_BASE=/directory/fhir` (default `/directory` is wrong now); `DISP-DEPLOY.md:74` is already right; frog-tests' `fhir.server.url` for the directory -> `.../directory/fhir`.
- Apply by rolling the directory Deployment (env change triggers it); HCPD IG reinstalls from the DB state as before.
