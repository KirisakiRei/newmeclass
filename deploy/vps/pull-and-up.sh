#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/newme/app}"
ENV_SOURCE="${ENV_SOURCE:-/opt/newme/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yml}"
BRANCH="${BRANCH:-main}"
RUN_SEED="${RUN_SEED:-false}"

if ! command -v git >/dev/null 2>&1; then
  echo "git belum terpasang."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker belum terpasang."
  exit 1
fi

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "Repo tidak ditemukan di ${APP_DIR}"
  exit 1
fi

if [ ! -f "${ENV_SOURCE}" ]; then
  echo "File env tidak ditemukan di ${ENV_SOURCE}"
  exit 1
fi

cd "${APP_DIR}"

echo "==> Update repo"
git fetch --all --prune
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "==> Copy env production"
cp "${ENV_SOURCE}" .env

echo "==> Validasi docker compose"
docker compose --env-file .env -f "${COMPOSE_FILE}" config >/dev/null

echo "==> Pull image"
docker compose --env-file .env -f "${COMPOSE_FILE}" pull

echo "==> Jalankan migration"
docker compose --env-file .env -f "${COMPOSE_FILE}" --profile ops run --rm migrate

echo "==> Jalankan service"
docker compose --env-file .env -f "${COMPOSE_FILE}" up -d

if [ "${RUN_SEED}" = "true" ]; then
  echo "==> Jalankan seed"
  docker compose --env-file .env -f "${COMPOSE_FILE}" --profile ops run --rm seed
fi

echo "==> Status container"
docker compose --env-file .env -f "${COMPOSE_FILE}" ps

echo "==> Bersihkan image lama"
docker image prune -f >/dev/null || true

echo "Deploy selesai."
