#!/bin/bash
# ==============================================================
# Backup DB → S3 (cron sur le serveur maison)
# Cron: */15 * * * * root /opt/auformat-next/infra/scripts/backup-db.sh
# ==============================================================
set -euo pipefail

BUCKET="auformat-failover-backups"
REGION="eu-west-3"
DB_NAME="auformat_db"
DB_USER="auformat_user"
TIMESTAMP=$(date +%Y%m%d-%H%M)
TMP_FILE="/tmp/auformat-backup.sql.gz"
LOG_FILE="/var/log/auformat/backup.log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
}

# Créer le dossier de logs si nécessaire
mkdir -p /var/log/auformat

log "Début du backup..."

# Dump de la base (en tant que postgres pour éviter le prompt password)
if sudo -u postgres pg_dump "$DB_NAME" | gzip > "$TMP_FILE"; then
  FILESIZE=$(du -h "$TMP_FILE" | cut -f1)
  log "Dump OK ($FILESIZE)"
else
  log "ERREUR: pg_dump a échoué"
  rm -f "$TMP_FILE"
  exit 1
fi

# Upload vers S3 (latest + archive)
if aws s3 cp "$TMP_FILE" "s3://${BUCKET}/db/latest.sql.gz" --region "$REGION" --quiet && \
   aws s3 cp "$TMP_FILE" "s3://${BUCKET}/db/archive/${TIMESTAMP}.sql.gz" --region "$REGION" --quiet; then
  log "Upload S3 OK (latest + archive/${TIMESTAMP})"
else
  log "ERREUR: Upload S3 a échoué"
  rm -f "$TMP_FILE"
  exit 1
fi

# Cleanup
rm -f "$TMP_FILE"
log "Backup terminé"
