#!/usr/bin/env bash
#
# Minimal-downtime deploy for emirates-status
#
# Builds in a staging directory while the app keeps running.
# Downtime is only the stop → swap .next → start (~2-3s).
# On any failure or signal after the service is stopped, rolls back
# to the previous build and restarts.
#
# Assumes: Ubuntu/Debian, root, systemd, rsync, curl, flock.
# Health target: http://localhost:3000
#
# Usage:  ssh root@128.140.36.174 'bash /root/emirates-status/scripts/deploy.sh'
#
set -euo pipefail

LOCK_FILE="/tmp/emirates-deploy.lock"
APP_DIR="/root/emirates-status"
STAGE_DIR="/root/emirates-status-stage"
BACKUP_DIR="/root/emirates-status-next-backup"
SERVICE="emirates-status"

# --- Precondition checks ---

for cmd in rsync curl flock; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "ERROR: $cmd is required. Install it with: apt-get install $cmd"
        exit 1
    fi
done

# --- Deploy lock ---

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "ERROR: Could not acquire deploy lock ($LOCK_FILE). Another deploy may be running."
    exit 1
fi

# --- State tracking ---

SERVICE_STOPPED=false
DEPLOY_SUCCESS=false

# cleanup runs on EXIT (covers normal exit, set -e, and after signal handlers).
# All commands are guarded with || true so set -e can't kill cleanup mid-way.
cleanup() {
    if [ "$DEPLOY_SUCCESS" = true ]; then
        rm -rf "$BACKUP_DIR" "$STAGE_DIR" || true
        return
    fi

    if [ "$SERVICE_STOPPED" = true ]; then
        echo "==> Deploy failed. Rolling back..."
        if [ -d "$BACKUP_DIR" ]; then
            rm -rf "${APP_DIR}/.next" || true
            mv "$BACKUP_DIR" "${APP_DIR}/.next" || true
        fi
        systemctl stop "$SERVICE" 2>/dev/null || true
        systemctl start "$SERVICE" || true
        sleep 3
        if curl -sf -o /dev/null "http://localhost:3000"; then
            echo "==> Rollback successful. Previous version is running."
        else
            echo "==> WARNING: Rollback restored files but app may not be healthy."
            echo "    Check logs: journalctl -u $SERVICE --since '2 minutes ago'"
        fi
    fi

    rm -rf "$STAGE_DIR" || true
}

on_signal() {
    echo ""
    echo "==> Caught signal. Aborting deploy..."
    exit 1
}

trap cleanup EXIT
trap on_signal INT TERM HUP

# --- Pull & install ---

cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm install --no-audit --no-fund

# --- Build in a staging copy ---

echo "==> Preparing staging directory..."
rm -rf "$STAGE_DIR"

rsync -a \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='emirates.db' \
    --exclude='emirates.db-wal' \
    --exclude='emirates.db-shm' \
    "$APP_DIR/" "$STAGE_DIR/"

ln -s "$APP_DIR/node_modules" "$STAGE_DIR/node_modules"

echo "==> Building in staging directory..."
cd "$STAGE_DIR"
npm run build

# --- Swap with rollback protection ---
# Order: clear stale backup → stop → backup live .next → swap → start.
# This ensures backup is always fresh when SERVICE_STOPPED becomes true.

echo "==> Stopping service..."
systemctl stop "$SERVICE"
SERVICE_STOPPED=true

# Back up current .next (service is stopped, safe to move)
if [ -d "${APP_DIR}/.next" ]; then
    rm -rf "$BACKUP_DIR"
    mv "${APP_DIR}/.next" "$BACKUP_DIR"
fi

echo "==> Swapping build output..."
mv "${STAGE_DIR}/.next" "${APP_DIR}/.next"

echo "==> Starting service..."
systemctl start "$SERVICE"

# Health check
echo "==> Verifying app health..."
HEALTHY=false
for i in 1 2 3 4 5; do
    sleep 2
    if curl -sf -o /dev/null "http://localhost:3000"; then
        HEALTHY=true
        break
    fi
    echo "    Attempt $i/5..."
done

if [ "$HEALTHY" = true ]; then
    SERVICE_STOPPED=false
    DEPLOY_SUCCESS=true
    echo "==> Deploy complete. App is healthy."
else
    echo "==> App not responding on port 3000. Triggering rollback."
    exit 1
fi
