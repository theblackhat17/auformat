#!/bin/bash
# ==============================================================
# Restore après failover - À exécuter sur le serveur maison
# Vérifie si un backup failover existe dans S3 et est plus récent
# que le dernier backup local, puis restaure la DB si nécessaire.
#
# Usage: sudo /opt/auformat-next/infra/scripts/restore-after-failover.sh
# Cron recommandé: @reboot (exécuté au redémarrage du serveur)
# ==============================================================
set -euo pipefail

BUCKET="auformat-failover-backups"
REGION="eu-west-3"
DB_NAME="auformat_db"
DB_USER="auformat_user"
TMP_FILE="/tmp/auformat-failover-restore.sql.gz"
LOG_FILE="/var/log/auformat/restore-failover.log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

mkdir -p /var/log/auformat

log "=== Vérification du backup failover ==="

# 1. Vérifier si un backup failover existe
FAILOVER_DATE=$(aws s3api head-object \
  --bucket "$BUCKET" \
  --key "db/failover-latest.sql.gz" \
  --region "$REGION" \
  --query "LastModified" \
  --output text 2>/dev/null || echo "")

if [ -z "$FAILOVER_DATE" ]; then
  log "Aucun backup failover trouvé dans S3. Rien à faire."
  exit 0
fi

log "Backup failover trouvé, date: $FAILOVER_DATE"

# 2. Vérifier la date du dernier backup local (latest.sql.gz)
LOCAL_DATE=$(aws s3api head-object \
  --bucket "$BUCKET" \
  --key "db/latest.sql.gz" \
  --region "$REGION" \
  --query "LastModified" \
  --output text 2>/dev/null || echo "")

log "Dernier backup local: $LOCAL_DATE"

# 3. Comparer les dates (le failover est-il plus récent?)
FAILOVER_TS=$(date -d "$FAILOVER_DATE" +%s 2>/dev/null || echo "0")
LOCAL_TS=$(date -d "$LOCAL_DATE" +%s 2>/dev/null || echo "0")

if [ "$FAILOVER_TS" -le "$LOCAL_TS" ]; then
  log "Le backup failover ($FAILOVER_DATE) n'est PAS plus récent que le local ($LOCAL_DATE). Rien à faire."
  exit 0
fi

log "Le backup failover est plus récent. Restauration en cours..."

# 4. Télécharger le backup failover
aws s3 cp "s3://${BUCKET}/db/failover-latest.sql.gz" "$TMP_FILE" --region "$REGION"

if [ ! -f "$TMP_FILE" ]; then
  log "ERREUR: Téléchargement du backup failover échoué"
  exit 1
fi

FILESIZE=$(du -h "$TMP_FILE" | cut -f1)
log "Backup téléchargé ($FILESIZE)"

# 5. Faire un backup de sécurité de la DB actuelle avant de restaurer
SAFETY_BACKUP="/tmp/auformat-pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz"
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$SAFETY_BACKUP"
log "Backup de sécurité créé: $SAFETY_BACKUP"

# 6. Restaurer la DB depuis le backup failover
log "Restauration de la base de données..."

# Fermer les connexions actives
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Drop et recréer
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# Restore
gunzip -c "$TMP_FILE" | sudo -u postgres psql "$DB_NAME" 2>&1 | tail -5

log "Base de données restaurée depuis le backup failover"

# 7. Cleanup
rm -f "$TMP_FILE"

# Supprimer le backup failover de S3 pour éviter de le re-restaurer
aws s3 rm "s3://${BUCKET}/db/failover-latest.sql.gz" --region "$REGION"
log "Backup failover supprimé de S3 (évite re-restauration)"

# Garder le backup de sécurité pendant 24h
log "Backup de sécurité conservé: $SAFETY_BACKUP (pensez à le supprimer)"

log "=== Restauration terminée ==="
