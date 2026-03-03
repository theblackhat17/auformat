#!/bin/bash
# ==============================================================
# On-Boot - Exécuté à chaque démarrage de l'EC2 failover
# 1. Récupère les secrets depuis SSM → .env.local
# 2. Restore la DB depuis S3
# 3. Télécharge le build depuis S3
# 4. Démarre l'app avec PM2
# ==============================================================
set -euo pipefail
exec > >(tee /var/log/auformat/on-boot.log) 2>&1

echo "=== Au Format On-Boot - $(date) ==="

APP_DIR="/opt/auformat-next"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-3}"
BUCKET="${BUCKET_NAME:-auformat-failover-backups}"
DB_NAME="${DB_NAME:-auformat_db}"
DB_USER="${DB_USER:-auformat_user}"

# --- 1. Récupérer les secrets depuis SSM ---
echo "[1/5] Récupération des secrets depuis SSM..."

get_param() {
  aws ssm get-parameter \
    --name "/auformat/$1" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo ""
}

DB_PASSWORD=$(get_param "DB_PASSWORD")
JWT_SECRET=$(get_param "JWT_SECRET")
BETTER_AUTH_SECRET=$(get_param "BETTER_AUTH_SECRET")
SMTP_HOST=$(get_param "SMTP_HOST")
SMTP_PORT=$(get_param "SMTP_PORT")
SMTP_USER=$(get_param "SMTP_USER")
SMTP_PASS=$(get_param "SMTP_PASS")
SMTP_FROM=$(get_param "SMTP_FROM")
GOOGLE_CLIENT_ID=$(get_param "GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET=$(get_param "GOOGLE_CLIENT_SECRET")
APP_URL=$(get_param "NEXT_PUBLIC_APP_URL")
BETTER_AUTH_URL=$(get_param "BETTER_AUTH_URL")

# Générer .env.local
cat > "$APP_DIR/.env.local" << EOF
NODE_ENV=production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
BETTER_AUTH_URL=${BETTER_AUTH_URL}
NEXT_PUBLIC_APP_URL=${APP_URL}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_FROM=${SMTP_FROM}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
EOF

chmod 600 "$APP_DIR/.env.local"
echo ".env.local généré"

# --- 2. Restore la base de données ---
echo "[2/5] Restauration de la base de données depuis S3..."

# S'assurer que PostgreSQL est démarré
systemctl start postgresql || true
sleep 2

# Télécharger le dernier backup
aws s3 cp "s3://${BUCKET}/db/latest.sql.gz" /tmp/auformat-backup.sql.gz --region "$AWS_REGION"

if [ -f /tmp/auformat-backup.sql.gz ]; then
  # Drop et recréer la DB pour un restore propre
  sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null || true
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

  # Restore
  gunzip -c /tmp/auformat-backup.sql.gz | PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h localhost "$DB_NAME" 2>&1 | tail -5
  rm -f /tmp/auformat-backup.sql.gz

  echo "Base de données restaurée"
else
  echo "ERREUR: Pas de backup trouvé dans S3"
fi

# --- 3. Télécharger le build standalone ---
echo "[3/5] Téléchargement du build depuis S3..."

# Standalone build
aws s3 cp "s3://${BUCKET}/build/standalone.tar.gz" /tmp/standalone.tar.gz --region "$AWS_REGION"
if [ -f /tmp/standalone.tar.gz ]; then
  # Nettoyer l'ancien build
  rm -rf "$APP_DIR/.next/standalone"
  mkdir -p "$APP_DIR/.next"
  tar xzf /tmp/standalone.tar.gz -C "$APP_DIR/.next/"
  rm -f /tmp/standalone.tar.gz

  # Copier les static files
  if [ -d "$APP_DIR/.next/static" ]; then
    cp -r "$APP_DIR/.next/static" "$APP_DIR/.next/standalone/.next/"
  fi

  echo "Build standalone restauré"
else
  echo "ERREUR: Pas de build trouvé dans S3"
fi

# Public assets
aws s3 cp "s3://${BUCKET}/build/public.tar.gz" /tmp/public.tar.gz --region "$AWS_REGION" || true
if [ -f /tmp/public.tar.gz ]; then
  tar xzf /tmp/public.tar.gz -C "$APP_DIR/"
  rm -f /tmp/public.tar.gz
  echo "Public assets restaurés"
fi

# --- 4. Activer le backup cron EC2 (toutes les 5 min pendant le failover) ---
echo "[4/6] Activation du backup cron EC2..."

chmod +x /opt/auformat-next/infra/scripts/backup-db-ec2.sh 2>/dev/null || true

# Ajouter le cron pour backup pendant le failover
CRON_LINE="*/5 * * * * root BUCKET_NAME=${BUCKET} AWS_DEFAULT_REGION=${AWS_REGION} DB_NAME=${DB_NAME} /opt/auformat-next/infra/scripts/backup-db-ec2.sh"
echo "$CRON_LINE" > /etc/cron.d/auformat-failover-backup
chmod 644 /etc/cron.d/auformat-failover-backup
echo "Cron backup EC2 activé (*/5 min)"

# --- 5. Créer ecosystem.config.js ---
echo "[5/6] Configuration PM2..."

cat > "$APP_DIR/ecosystem.config.js" << PMEOF
module.exports = {
  apps: [{
    name: 'auformat',
    script: '.next/standalone/server.js',
    cwd: '${APP_DIR}',
    env: {
      NODE_ENV: 'production',
      PORT: 3006,
      HOSTNAME: '0.0.0.0',
    },
    max_memory_restart: '512M',
    error_file: '/var/log/auformat/error.log',
    out_file: '/var/log/auformat/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
PMEOF

# Symlink public si nécessaire
ln -sfn "$APP_DIR/public" "$APP_DIR/.next/standalone/public" 2>/dev/null || true

# --- 6. Démarrer l'application ---
echo "[6/6] Démarrage de l'application..."

# S'assurer que Nginx est démarré
systemctl start nginx || true

# Stopper l'ancien process PM2 s'il existe
cd "$APP_DIR"
sudo -u ec2-user bash -c "source $APP_DIR/.env.local && cd $APP_DIR && pm2 delete auformat 2>/dev/null || true && pm2 start ecosystem.config.js"

# Health check
sleep 5
RETRIES=12
for i in $(seq 1 $RETRIES); do
  if curl -sf http://localhost:3006 > /dev/null 2>&1; then
    echo "Application démarrée et accessible sur le port 3006"
    break
  fi
  if [ "$i" -eq "$RETRIES" ]; then
    echo "ATTENTION: L'application ne répond pas après ${RETRIES} tentatives"
  fi
  echo "Attente du démarrage... ($i/$RETRIES)"
  sleep 5
done

echo "=== On-Boot terminé - $(date) ==="
