#!/usr/bin/env bash
# Fresh setup only. Existing VM: back up, then apply a reviewed migration instead.
set -euo pipefail
: "${DB_BOOTSTRAP_PASSWORD:?Set a new DB_BOOTSTRAP_PASSWORD in the shell before running}"
apt update
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
PG_CONF=$(runuser -u postgres -- psql -Atc 'SHOW config_file')
PG_HBA=$(runuser -u postgres -- psql -Atc 'SHOW hba_file')
# Existing broad access rules require manual review; do not silently leave them enabled.
if grep -Eq '^host[[:space:]]+all[[:space:]]+all[[:space:]]+0\.0\.0\.0/0' "$PG_HBA"; then
  echo 'Existing unrestricted HBA rule found. Review network access before continuing.' >&2
  exit 1
fi
sed -i "/^[#[:space:]]*listen_addresses[[:space:]]*=/c\\listen_addresses = 'localhost,192.168.100.102'" "$PG_CONF"
for address in 192.168.100.101/32 192.168.100.103/32; do
  if ! grep -Fq "$address" "$PG_HBA"; then
    printf 'host cedatabase all %s scram-sha-256\n' "$address" >> "$PG_HBA"
  fi
done
# Avoid putting the bootstrap password on the process command line.
runuser -u postgres -- env DB_BOOTSTRAP_PASSWORD="$DB_BOOTSTRAP_PASSWORD" psql -v ON_ERROR_STOP=1 <<'SQL'
\getenv bootstrap_password DB_BOOTSTRAP_PASSWORD
SELECT 'CREATE ROLE ceadmin LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ceadmin') \gexec
SELECT format('ALTER ROLE ceadmin PASSWORD %L', :'bootstrap_password') \gexec
SELECT 'CREATE DATABASE cedatabase OWNER ceadmin'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'cedatabase') \gexec
SQL
systemctl restart postgresql
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d cedatabase -f "$script_dir/../database/init.sql"
echo 'Schema installed. Apply database/migrations/001_service_roles.sql and configure the portal environment.'
