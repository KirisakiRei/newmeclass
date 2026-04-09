#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
RUN_SEED="${2:-false}"
REPO_URL="${REPO_URL:-https://github.com/KirisakiRei/newmeclass.git}"
BASE_DIR="${BASE_DIR:-/opt/newme}"
APP_DIR="${APP_DIR:-${BASE_DIR}/app}"
ENV_FILE="${ENV_FILE:-${BASE_DIR}/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yml}"

if ! command -v git >/dev/null 2>&1; then
  echo "git belum terpasang. Install git dulu di server."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker belum terpasang. Jalankan bootstrap server dulu."
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Env file tidak ditemukan di ${ENV_FILE}"
  exit 1
fi

mkdir -p "${BASE_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
  git clone --branch "${BRANCH}" --single-branch "${REPO_URL}" "${APP_DIR}"
else
  cd "${APP_DIR}"
  git fetch --prune origin
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
fi

cd "${APP_DIR}"

cp "${ENV_FILE}" "${APP_DIR}/.env"

if [ -n "${DOCKERHUB_USERNAME:-}" ] && [ -n "${DOCKERHUB_TOKEN:-}" ]; then
  echo "${DOCKERHUB_TOKEN}" | docker login --username "${DOCKERHUB_USERNAME}" --password-stdin
fi

docker compose --env-file .env -f "${COMPOSE_FILE}" pull
docker compose --env-file .env -f "${COMPOSE_FILE}" up -d

if [ "${RUN_SEED}" = "true" ]; then
  docker compose --env-file .env -f "${COMPOSE_FILE}" --profile ops run --rm seed
fi

docker image prune -f

echo "Deploy manual selesai."
