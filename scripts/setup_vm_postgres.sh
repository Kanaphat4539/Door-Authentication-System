#!/usr/bin/env bash
set -e

echo "=== [1/5] Installing PostgreSQL & Utilities ==="
apt update
apt install -y postgresql postgresql-contrib sudo curl ufw net-tools

echo "=== [2/5] Starting & Enabling PostgreSQL Service ==="
systemctl enable postgresql
systemctl start postgresql

PG_CONF=$(find /etc/postgresql/ -name "postgresql.conf" | head -n 1)
PG_HBA=$(find /etc/postgresql/ -name "pg_hba.conf" | head -n 1)

echo "Found PG config: $PG_CONF"
echo "Found PG HBA: $PG_HBA"

echo "=== [3/5] Configuring Network Access in postgresql.conf and pg_hba.conf ==="
# Allow listening on all interfaces
sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
sed -i "s/^listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"

# Allow connection from LAN subnet 192.168.100.0/24, KMITL subnet 172.16.0.0/16, and any client with password
if ! grep -q "192.168.100.0/24" "$PG_HBA"; then
    echo "host    all             all             192.168.100.0/24        scram-sha-256" >> "$PG_HBA"
fi
if ! grep -q "172.16.0.0/16" "$PG_HBA"; then
    echo "host    all             all             172.16.0.0/16           scram-sha-256" >> "$PG_HBA"
fi
if ! grep -q "all             all             0.0.0.0/0" "$PG_HBA"; then
    echo "host    all             all             0.0.0.0/0               scram-sha-256" >> "$PG_HBA"
fi

systemctl restart postgresql

echo "=== [4/5] Creating Database & User ==="
runuser -u postgres -- psql <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ceadmin') THEN
        CREATE ROLE ceadmin WITH LOGIN SUPERUSER PASSWORD 'ceadmin2026';
    ELSE
        ALTER ROLE ceadmin WITH SUPERUSER PASSWORD 'ceadmin2026';
    END IF;
END
\$\$;

SELECT 'CREATE DATABASE cedatabase OWNER ceadmin'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cedatabase')\gexec

GRANT ALL PRIVILEGES ON DATABASE cedatabase TO ceadmin;
EOF

echo "=== [5/5] Importing Database Schema ==="
if [ -f "/root/postgres_init.sql" ]; then
    runuser -u postgres -- psql -d cedatabase -f /root/postgres_init.sql
    runuser -u postgres -- psql -d cedatabase <<EOF
GRANT ALL ON SCHEMA public TO ceadmin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ceadmin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ceadmin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ceadmin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ceadmin;
EOF
fi

echo "=== Setup Completed Successfully! ==="
runuser -u postgres -- psql -d cedatabase -c "SELECT count(*) AS total_users FROM users;"
runuser -u postgres -- psql -d cedatabase -c "SELECT username, attribute, value FROM radcheck LIMIT 3;"
