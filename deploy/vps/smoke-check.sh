#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-/opt/newme/app}"
cd "${PROJECT_DIR}"

docker compose ps
docker compose ps --status running backend public_frontend dashboard_frontend database redis >/dev/null
curl -fsS http://127.0.0.1/api/health >/dev/null
echo "NEWME smoke check passed."
