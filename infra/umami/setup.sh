#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Umami Analytics Setup ==="

# 1. Generate secrets if .env doesn't exist
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  UMAMI_DB_PASSWORD=$(openssl rand -hex 16)
  UMAMI_APP_SECRET=$(openssl rand -hex 32)

  cat > "$SCRIPT_DIR/.env" <<EOF
UMAMI_DB_PASSWORD=$UMAMI_DB_PASSWORD
UMAMI_APP_SECRET=$UMAMI_APP_SECRET
EOF
  echo "[OK] Generated .env with secrets"
else
  echo "[OK] .env already exists"
  source "$SCRIPT_DIR/.env"
  UMAMI_DB_PASSWORD="${UMAMI_DB_PASSWORD:-}"
fi

# 2. Create PostgreSQL user and database
echo "Creating PostgreSQL database and user..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'umami') THEN
    CREATE ROLE umami WITH LOGIN PASSWORD '$UMAMI_DB_PASSWORD';
  ELSE
    ALTER ROLE umami WITH PASSWORD '$UMAMI_DB_PASSWORD';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE umami OWNER umami'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'umami')\gexec

GRANT ALL PRIVILEGES ON DATABASE umami TO umami;
EOSQL
echo "[OK] PostgreSQL database 'umami' ready"

# 3. Allow Docker host to connect to PostgreSQL
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file" | tr -d ' ')
if ! grep -q "umami" "$PG_HBA" 2>/dev/null; then
  echo "# Umami Docker access" | sudo tee -a "$PG_HBA" > /dev/null
  echo "host    umami    umami    172.17.0.0/16    md5" | sudo tee -a "$PG_HBA" > /dev/null
  sudo systemctl reload postgresql
  echo "[OK] Added Docker network to pg_hba.conf"
else
  echo "[OK] pg_hba.conf already configured for umami"
fi

# 4. Start Umami
echo "Starting Umami container..."
cd "$SCRIPT_DIR"
docker compose up -d
echo "[OK] Umami started on port 3001"

echo ""
echo "=== Setup Complete ==="
echo "Umami is running at http://localhost:3001/umami"
echo "Default login: admin / umami"
echo "IMPORTANT: Change the default password after first login!"
echo ""
echo "Next steps:"
echo "1. Configure Nginx (see nginx.conf snippet below)"
echo "2. Login to Umami, add your website, copy the website ID"
echo "3. Set NEXT_PUBLIC_UMAMI_WEBSITE_ID in .env.local"
