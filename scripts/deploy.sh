#!/usr/bin/env bash
#
# Minimal-downtime deploy for emirates-status
#
# Builds in a staging directory while the app keeps running.
# Downtime is only the stop → swap .next → start (~2-3s).
#
# Usage:  ssh root@128.140.36.174 'bash /root/emirates-status/scripts/deploy.sh'
#
set -euo pipefail

APP_DIR="/root/emirates-status"
STAGE_DIR="/root/emirates-status-stage"
SERVICE="emirates-status"

cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm install --no-audit --no-fund

# --- Build in a staging copy ---

echo "==> Preparing staging directory..."
rm -rf "$STAGE_DIR"

# Copy everything except .next, .git, db files, and node_modules
rsync -a \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='emirates.db' \
    --exclude='emirates.db-wal' \
    --exclude='emirates.db-shm' \
    "$APP_DIR/" "$STAGE_DIR/"

# Symlink node_modules so the build uses the real installed deps
ln -s "$APP_DIR/node_modules" "$STAGE_DIR/node_modules"

echo "==> Building in staging directory..."
cd "$STAGE_DIR"
npm run build

# --- Quick swap: stop → replace .next → start ---

echo "==> Stopping service..."
systemctl stop "$SERVICE"

echo "==> Swapping build output..."
rm -rf "${APP_DIR}/.next"
mv "${STAGE_DIR}/.next" "${APP_DIR}/.next"

echo "==> Starting service..."
systemctl start "$SERVICE"

# --- Cleanup & verify ---

rm -rf "$STAGE_DIR"

sleep 3
if systemctl is-active --quiet "$SERVICE"; then
    echo "==> Deploy complete. Service is running."
else
    echo "==> WARNING: Service failed to start. Check logs:"
    echo "    journalctl -u $SERVICE --since '2 minutes ago'"
    exit 1
fi
