#!/bin/bash
# ==============================================================
# Filet de sécurité : pousse le build vers S3 UNIQUEMENT quand il a changé.
# Garantit que l'EC2 de failover sert toujours la dernière version, quelle
# que soit la méthode de déploiement (npm run deploy, ou build + pm2 restart).
# Cron: tous les quarts d'heure. Compare .next/BUILD_ID à un marqueur.
# ==============================================================
set -euo pipefail
export PATH="/usr/local/bin:$PATH"  # aws CLI absent du PATH restreint de cron

BUILD_ID_FILE=/opt/auformat-next/.next/BUILD_ID
MARKER=/var/lib/auformat/last-synced-build
LOG=/var/log/auformat/sync-build.log
mkdir -p /var/lib/auformat /var/log/auformat

[ -f "$BUILD_ID_FILE" ] || exit 0
CUR=$(cat "$BUILD_ID_FILE")
PREV=$(cat "$MARKER" 2>/dev/null || echo "")

if [ "$CUR" != "$PREV" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') BUILD_ID changé ($PREV -> $CUR), sync vers S3…" >> "$LOG"
  if bash /opt/auformat-next/infra/scripts/sync-build.sh >> "$LOG" 2>&1; then
    echo "$CUR" > "$MARKER"
    echo "$(date '+%Y-%m-%d %H:%M:%S') Sync OK" >> "$LOG"
  else
    echo "$(date '+%Y-%m-%d %H:%M:%S') ERREUR sync (voir ci-dessus)" >> "$LOG"
  fi
fi
