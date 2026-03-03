#!/bin/bash
# ==============================================================
# Backup DB EC2 → S3 (cron actif pendant le failover)
# Cron ajouté par on-boot.sh : */5 * * * *
# ==============================================================
set -euo pipefail

BUCKET="${BUCKET_NAME:-auformat-failover-backups}"
REGION="${AWS_DEFAULT_REGION:-eu-west-3}"
DB_NAME="${DB_NAME:-auformat_db}"
DB_USER="${DB_USER:-auformat_user}"
TMP_FILE="/tmp/auformat-failover-backup.sql.gz"
LOG_FILE="/var/log/auformat/backup-ec2.log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
}

mkdir -p /var/log/auformat

log "Début du backup EC2..."

# Dump de la base
if sudo -u postgres pg_dump "$DB_NAME" | gzip > "$TMP_FILE"; then
  FILESIZE=$(du -h "$TMP_FILE" | cut -f1)
  log "Dump OK ($FILESIZE)"
else
  log "ERREUR: pg_dump a échoué"
  rm -f "$TMP_FILE"
  exit 1
fi

# Upload vers S3 (failover-latest = le dernier état pendant le failover)
if aws s3 cp "$TMP_FILE" "s3://${BUCKET}/db/failover-latest.sql.gz" --region "$REGION" --quiet; then
  log "Upload S3 OK (failover-latest.sql.gz)"
else
  log "ERREUR: Upload S3 a échoué"
  rm -f "$TMP_FILE"
  exit 1
fi

# Cleanup
rm -f "$TMP_FILE"
log "Backup EC2 terminé"
