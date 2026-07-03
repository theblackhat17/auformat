#!/bin/bash
# ==============================================================
# Watchdog Umami : vérifie le heartbeat de l'app analytics et
# redémarre le conteneur Docker si elle ne répond plus.
# (restart=always couvre un crash du process, pas un conteneur
# bloqué/unhealthy — d'où ce filet de sécurité.)
# Cron: */5 * * * * (voir /etc/cron.d/auformat-umami-watchdog)
# ==============================================================
set -uo pipefail

URL="http://localhost:3001/api/heartbeat"
LOG="/var/log/auformat/umami-watchdog.log"
mkdir -p /var/log/auformat
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

# 2 tentatives espacées de 10 s avant de conclure à une panne
for i in 1 2; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$URL" 2>/dev/null || echo "000")
  [ "$CODE" = "200" ] && exit 0
  [ "$i" = "1" ] && sleep 10
done

log "Umami ne répond pas (HTTP $CODE) → docker restart umami"
if docker restart umami >> "$LOG" 2>&1; then
  sleep 20
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$URL" 2>/dev/null || echo "000")
  log "Après redémarrage : HTTP $CODE"
else
  log "ERREUR: docker restart a échoué"
fi
