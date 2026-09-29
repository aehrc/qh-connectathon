#!/usr/bin/env bash
#
# install.sh — bootstrap the Track 2 (FHIR for Services) stack on the host VM.
#
# Target: aehrc-qh-connectathon-track-2.it.csiro.au (Ubuntu 24.04), AFTER the
# quota increase (>= 8 GB RAM for experiment; 16 GB recommended for the event).
#
# Brings up a self-contained stack — referral FHIR server, directory FHIR server,
# Postgres, and the Patient-Referral referrer — with terminology EXTERNAL (TX_URL).
#
# Usage:
#   sudo ./install.sh            # installs docker (needs sudo once), then builds the stack
#   sudo ./install.sh --docker-only    # install docker only (prep before VM resize)
#   ./install.sh --no-docker-install   # skip docker install (already present)
#   TX_URL=https://r4.ontoserver.csiro.au/fhir ./install.sh
#
# Idempotent: safe to re-run. Config lives in deploy/.env (created from defaults).

set -euo pipefail

# ---- Config (override via env) --------------------------------------------
TX_URL="${TX_URL:-https://tx.ontoserver.csiro.au/fhir}"      # external terminology — CONFIRM before the event
HCPD_PKG_URL="${HCPD_PKG_URL:-https://build.fhir.org/ig/AuDigitalHealth/HCPD/package.tgz}"
RADIOLOGY_IG_PKG="${RADIOLOGY_IG_PKG:-https://build.fhir.org/ig/aehrc/radiology-referral/package.tgz}"
HAPI_IMAGE="${HAPI_IMAGE:-hapiproject/hapi:latest}"
REFERRER_IMAGE="${REFERRER_IMAGE:-}"        # built from source if empty
WORKDIR="${WORKDIR:-$HOME/track2-stack}"

say() { printf '\033[1;36m[install]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[install] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

INSTALL_DOCKER=1
DOCKER_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --no-docker-install) INSTALL_DOCKER=0 ;;
    --docker-only)       DOCKER_ONLY=1 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown option: $arg" ;;
  esac
done

# ---- Pre-flight ------------------------------------------------------------
MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
say "Detected ${MEM_MB} MB RAM."
[ "$MEM_MB" -lt 7500 ] && say "WARNING: < 8 GB RAM — the two HAPI servers may thrash. Proceeding anyway."

# ---- 1. Docker -------------------------------------------------------------
if [ "$INSTALL_DOCKER" = 1 ] && ! command -v docker >/dev/null; then
  say "Installing docker.io (needs sudo)…"
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker.io docker-compose-v2
  sudo usermod -aG docker "$USER"
  say "Added $USER to the docker group. You may need to log out/in for it to take effect."
  say "If 'docker ps' fails below, re-run this script in a fresh shell."
fi

if [ "$DOCKER_ONLY" = 1 ]; then
  say "--docker-only: runtime prepared. Docker is installed$( groups | grep -q docker && echo " and your shell has the docker group" || echo "; log out/in (or 'newgrp docker') so the group applies" )."
  say "After the VM is resized, run:  ./install.sh        # no sudo needed for the stack"
  exit 0
fi

command -v docker >/dev/null || die "docker not available"
docker compose version >/dev/null 2>&1 || die "docker compose v2 not available"

# ---- 2. Workspace + config -------------------------------------------------
mkdir -p "$WORKDIR"/{config,seed}
cd "$WORKDIR"

if [ ! -f .env ]; then
  cat > .env <<EOF
# Track 2 stack config — edit before the event
TX_URL=${TX_URL}
HAPI_IMAGE=${HAPI_IMAGE}
POSTGRES_PASSWORD=$(head -c16 /dev/urandom | od -An -tx1 | tr -d ' \n')
EOF
  say "Wrote $WORKDIR/.env (review TX_URL — currently ${TX_URL})."
fi

# ---- 3. IG packages (HCPD not on public registries — fetch the tarball) ----
say "Fetching IG packages…"
curl -fsSL -o config/hcpd.tgz            "$HCPD_PKG_URL"      || die "could not fetch HCPD package"
curl -fsSL -o config/radiology-referral.tgz "$RADIOLOGY_IG_PKG" || say "WARN: radiology-referral package not fetched (build may be pending) — referral server will start without it"

# ---- 4. Compose file -------------------------------------------------------
# Two HAPI servers (referral + directory), shared Postgres, referrer.
# Terminology is remote (TX_URL) — no tx container.
cat > docker-compose.yml <<'YAML'
name: track2
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: hapi
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: hapi
    volumes: [ "pgdata:/var/lib/postgresql/data" ]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hapi"]
      interval: 10s
      timeout: 5s
      retries: 10

  fhir:                       # Referral server — radiology-referral IG
    image: ${HAPI_IMAGE}
    depends_on: { db: { condition: service_healthy } }
    environment:
      JAVA_OPTS: "-Xmx2g"
      SPRING_DATASOURCE_URL: "jdbc:postgresql://db:5432/hapi"
      SPRING_DATASOURCE_USERNAME: hapi
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      SPRING_DATASOURCE_DRIVERCLASSNAME: org.postgresql.Driver
      SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT: "ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgres94Dialect"
      HAPI_FHIR_FHIR_VERSION: R4
      # Remote terminology — the one external dependency
      HAPI_FHIR_REMOTE_TERMINOLOGY_SERVICES_0_SYSTEM: "http://snomed.info/sct"
      HAPI_FHIR_REMOTE_TERMINOLOGY_SERVICES_0_URL: "${TX_URL}"
    ports: [ "8080:8080" ]
    deploy: { resources: { limits: { memory: 3g } } }

  directory:                  # Provider directory — HCPD IG
    image: ${HAPI_IMAGE}
    depends_on: { db: { condition: service_healthy } }
    environment:
      JAVA_OPTS: "-Xmx2g"
      SPRING_DATASOURCE_URL: "jdbc:postgresql://db:5432/hapi_dir"
      SPRING_DATASOURCE_USERNAME: hapi
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      SPRING_DATASOURCE_DRIVERCLASSNAME: org.postgresql.Driver
      SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT: "ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgres94Dialect"
      HAPI_FHIR_FHIR_VERSION: R4
      HAPI_FHIR_REMOTE_TERMINOLOGY_SERVICES_0_SYSTEM: "http://snomed.info/sct"
      HAPI_FHIR_REMOTE_TERMINOLOGY_SERVICES_0_URL: "${TX_URL}"
    ports: [ "8081:8080" ]
    deploy: { resources: { limits: { memory: 3g } } }

volumes:
  pgdata:
YAML

# Note: the directory server needs its own DB. Create it once Postgres is up.
say "Bringing up Postgres first (to create the directory DB)…"
docker compose --env-file .env up -d db
until docker compose exec -T db pg_isready -U hapi >/dev/null 2>&1; do sleep 2; done
docker compose exec -T db psql -U hapi -tc "SELECT 1 FROM pg_database WHERE datname='hapi_dir'" \
  | grep -q 1 || docker compose exec -T db createdb -U hapi hapi_dir
say "Directory DB ready."

# ---- 5. Start the FHIR servers --------------------------------------------
say "Starting the FHIR servers (referral :8080, directory :8081)…"
docker compose --env-file .env up -d fhir directory

# ---- 6. Wait for readiness -------------------------------------------------
wait_fhir() { # name url
  say "Waiting for $1 at $2 …"
  for _ in $(seq 1 60); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' "$2/metadata" 2>/dev/null)" = 200 ] && { say "$1 is up."; return 0; }
    sleep 5
  done
  die "$1 did not become ready at $2"
}
wait_fhir "referral server" "http://localhost:8080/fhir"
wait_fhir "directory server" "http://localhost:8081/fhir"

# ---- 7. Load the IG packages ($install) -----------------------------------
install_pkg() { # base tgz
  [ -f "$2" ] || { say "skip: $2 not present"; return 0; }
  say "Installing $(basename "$2") into $1 …"
  # Upload the package to the server's package cache and install it.
  curl -fsS -X POST "$1/\$install" \
    -H 'Content-Type: application/fhir+json' \
    -d "{\"resourceType\":\"Parameters\",\"parameter\":[{\"name\":\"npmContent\",\"valueBase64Binary\":\"$(base64 -w0 "$2")\"}]}" \
    >/dev/null && say "  installed." || say "  WARN: \$install failed for $(basename "$2") — check server logs / dependency resolution (au.pd is a floating 'current' dep)."
}
install_pkg "http://localhost:8081/fhir" "config/hcpd.tgz"
install_pkg "http://localhost:8080/fhir" "config/radiology-referral.tgz"

# ---- 8. Referrer (Patient-Referral) ---------------------------------------
say "Building and starting the Patient-Referral referrer (:5000)…"
if [ ! -d Patient-Referral/.git ]; then
  git clone --depth 1 https://github.com/mjosborne1/Patient-Referral.git
fi
docker build -t patient-referral:local Patient-Referral
docker rm -f referrer 2>/dev/null || true
docker run -d --name referrer --network track2_default -p 5000:5000 \
  -e USE_AUTH=false \
  -e FHIR_SERVER="http://fhir:8080/fhir" \
  -e PD_SERVER="http://directory:8080/fhir" \
  patient-referral:local

# ---- Done ------------------------------------------------------------------
say "Stack up:"
say "  Referral FHIR : http://<vm>:8080/fhir"
say "  Directory FHIR: http://<vm>:8081/fhir  (HCPD IG)"
say "  Referrer UI   : http://<vm>:5000"
say "  Terminology   : ${TX_URL} (external)"
say "Next: run smoke/smoke.sh to seed + drive the flow; put a TLS ingress in front for the event."
