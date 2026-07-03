#!/bin/bash
# ==============================================================
# Réimport fiable des écritures faites sur l'EC2 pendant un failover.
#
# Remplace la logique fragile de restore-after-failover.sh (@reboot +
# comparaison de dates). Ici on se base sur un MARQUEUR `db/failover-final.json`
# écrit par la Lambda UNIQUEMENT à la fin d'un vrai failover. On importe le dump
# final EC2 exactement une fois par failover, avec backup de sécurité.
#
# Cron: */5 * * * *  +  @reboot (voir /etc/cron.d/auformat-import-failover)
# ==============================================================
set -euo pipefail
export PATH="/usr/local/bin:$PATH"  # aws CLI hors du PATH restreint de cron

BUCKET="auformat-failover-backups"
REGION="eu-west-3"
INSTANCE_ID="i-07574aae2f65ff98b"
DB_NAME="auformat_db"
DB_USER="auformat_user"
MARKER_KEY="db/failover-final.json"
DUMP_KEY="db/failover-latest.sql.gz"
STATE="/var/lib/auformat/last-imported-failover"   # dernier endedAt importé
LOG="/var/log/auformat/import-failover.log"
MAX_AGE_SECONDS=$((6 * 3600))                        # garde-fou anti-vieux marqueur

mkdir -p /var/lib/auformat /var/log/auformat /var/backups/auformat
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

# 1. Récupérer le marqueur de fin de failover (absent = rien à faire, cas normal)
TMPJSON="/tmp/failover-final.json"
if ! aws s3 cp "s3://${BUCKET}/${MARKER_KEY}" "$TMPJSON" --region "$REGION" --quiet 2>/dev/null; then
  exit 0
fi
ENDED=$(grep -o '"endedAt"[[:space:]]*:[[:space:]]*"[^"]*"' "$TMPJSON" | sed -E 's/.*"([^"]+)"$/\1/')
if [ -z "$ENDED" ]; then log "Marqueur présent mais illisible, ignoré"; rm -f "$TMPJSON"; exit 0; fi

# 2. Déjà importé ? (idempotence par endedAt)
PREV=$(cat "$STATE" 2>/dev/null || echo "")
if [ "$ENDED" = "$PREV" ]; then rm -f "$TMPJSON"; exit 0; fi

# 3. Garde-fou : ne réimporter qu'un marqueur récent (un vrai failback est suivi
#    du cron maison en quelques minutes). Évite d'écraser la base avec un vieux dump.
ENDED_TS=$(date -d "$ENDED" +%s 2>/dev/null || echo "0")
NOW_TS=$(date +%s)
if [ "$ENDED_TS" -gt 0 ] && [ $((NOW_TS - ENDED_TS)) -gt "$MAX_AGE_SECONDS" ]; then
  log "Marqueur trop ancien ($ENDED), ignoré par sécurité (marqué comme traité)"
  echo "$ENDED" > "$STATE"; rm -f "$TMPJSON"; exit 0
fi

# 4. Sécurité : ne pas importer si on est encore en failover (EC2 running/pending)
EC2_STATE=$(aws ec2 describe-instances --instance-id "$INSTANCE_ID" --region "$REGION" \
  --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo "unknown")
if [ "$EC2_STATE" = "running" ] || [ "$EC2_STATE" = "pending" ]; then
  log "Failover encore actif (EC2=$EC2_STATE), report au prochain passage"
  rm -f "$TMPJSON"; exit 0
fi

log "=== Failback détecté (endedAt=$ENDED, EC2=$EC2_STATE) → réimport des écritures EC2 ==="

# 5. Backup de sécurité de la base actuelle AVANT d'écraser
SAFETY="/var/backups/auformat/pre-import-$(date +%Y%m%d-%H%M%S).sql.gz"
if sudo -u postgres pg_dump "$DB_NAME" | gzip > "$SAFETY"; then
  log "Backup de sécurité créé: $SAFETY"
else
  log "ERREUR: backup de sécurité échoué, abandon (aucune donnée touchée)"; rm -f "$TMPJSON"; exit 1
fi

# 6. Télécharger le dump final de l'EC2
TMPDUMP="/tmp/failover-latest.sql.gz"
if ! aws s3 cp "s3://${BUCKET}/${DUMP_KEY}" "$TMPDUMP" --region "$REGION" --quiet || [ ! -s "$TMPDUMP" ]; then
  log "ERREUR: dump final EC2 absent/vide, abandon (base inchangée)"; rm -f "$TMPJSON"; exit 1
fi

# 7. Restaurer (drop + recreate + restore)
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid<>pg_backend_pid();" >/dev/null 2>&1 || true
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
gunzip -c "$TMPDUMP" | sudo -u postgres psql "$DB_NAME" >/dev/null 2>&1
log "Base restaurée depuis le dump final EC2"

# 8. Marquer comme importé, nettoyer le marqueur S3, relancer l'app
echo "$ENDED" > "$STATE"
aws s3 rm "s3://${BUCKET}/${MARKER_KEY}" --region "$REGION" --quiet 2>/dev/null || true
rm -f "$TMPDUMP" "$TMPJSON"
pm2 restart auformat --update-env >/dev/null 2>&1 || true
log "=== Réimport terminé (endedAt=$ENDED). Backup de sécurité: $SAFETY ==="
