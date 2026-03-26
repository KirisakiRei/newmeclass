#!/bin/sh
set -eu

if [ -z "${MYSQL_USER:-}" ] || [ -z "${MYSQL_PASSWORD:-}" ]; then
  echo "[mysql-init] MYSQL_USER atau MYSQL_PASSWORD belum diset; lewati auth compatibility setup."
  exit 0
fi

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
ALTER USER IF EXISTS '${MYSQL_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${MYSQL_PASSWORD}';
FLUSH PRIVILEGES;
EOSQL
