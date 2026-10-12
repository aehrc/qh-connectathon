#!/usr/bin/env bash
#
# fix-docker-noexec.sh — revive docker/runc on the USG/CIS-hardened VM.
#
# Root cause: CIS hardening mounts /run (and /tmp, /var/tmp, /dev/shm) noexec.
# runc execs its init from its state dir under /run → blocked by noexec →
#   "runc create failed: ... fork/exec /proc/self/fd/6: permission denied".
# (microk8s is unaffected: its containerd state lives under /var/snap/microk8s,
#  which is not noexec.)
#
# Fix: point dockerd's exec-root at an exec-capable dir on /var (which is NOT
# noexec — only /tmp, /var/tmp, /run, /dev/shm are). This keeps the CIS noexec
# hardening intact everywhere else.
#
# Run with: sudo ./fix-docker-noexec.sh
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run with sudo"; exit 1; }

EXEC_ROOT=/var/lib/docker-exec
DAEMON=/etc/docker/daemon.json

echo "[fix] exec-capable target: $EXEC_ROOT (on /var, no noexec)"
mkdir -p "$EXEC_ROOT"

# sanity: prove /var can exec
t="$EXEC_ROOT/.exectest"; printf '#!/bin/sh\necho ok\n' > "$t"; chmod +x "$t"
if ! "$t" >/dev/null 2>&1; then echo "[fix] ERROR: $EXEC_ROOT is not exec-capable — aborting"; rm -f "$t"; exit 1; fi
rm -f "$t"
echo "[fix] confirmed $EXEC_ROOT is exec-capable"

# merge exec-root into daemon.json (create or update)
if [ -f "$DAEMON" ] && grep -q '"exec-root"' "$DAEMON"; then
  echo "[fix] exec-root already set in $DAEMON:"; grep exec-root "$DAEMON"
else
  if [ -f "$DAEMON" ]; then cp "$DAEMON" "$DAEMON.bak.$(date +%s)"; echo "[fix] backed up existing daemon.json"; fi
  if command -v jq >/dev/null && [ -s "$DAEMON" ]; then
    tmp=$(mktemp); jq --arg er "$EXEC_ROOT" '. + {"exec-root":$er}' "$DAEMON" > "$tmp" && mv "$tmp" "$DAEMON"
  else
    printf '{\n  "exec-root": "%s"\n}\n' "$EXEC_ROOT" > "$DAEMON"
  fi
  echo "[fix] wrote exec-root to $DAEMON"
fi

echo "[fix] restarting docker…"
systemctl restart docker
sleep 3

echo "[fix] verifying with hello-world…"
if docker run --rm hello-world 2>&1 | grep -q 'Hello from Docker'; then
  echo "[fix] SUCCESS — docker/runc works again."
else
  echo "[fix] STILL FAILING. Fallback options:"
  echo "      A) remount /run exec:   mount -o remount,exec /run   (undoes CIS on /run only, non-persistent)"
  echo "      B) check: mount | grep noexec ; and dmesg | tail"
  docker run --rm hello-world 2>&1 | tail -3
  exit 1
fi
