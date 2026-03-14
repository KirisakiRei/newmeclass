#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Run this script as root."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl ufw

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker
systemctl restart docker

mkdir -p /opt/newme
chmod 755 /opt /opt/newme

ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw --force enable || true

docker --version
docker compose version

echo "Bootstrap selesai. VPS siap untuk workflow Deploy Production."
