#!/bin/bash
# ==============================================================
# Sync Build → S3 (à exécuter après chaque npm run deploy)
# Usage: bash /opt/auformat-next/infra/scripts/sync-build.sh
# ==============================================================
set -euo pipefail

BUCKET="auformat-failover-backups"
REGION="eu-west-3"
APP_DIR="/opt/auformat-next"

echo "=== Sync Build vers S3 ==="

# Vérifier que le build existe
if [ ! -d "$APP_DIR/.next/standalone" ]; then
  echo "ERREUR: .next/standalone n'existe pas. Lancez 'npm run build' d'abord."
  exit 1
fi

# Upload du build standalone
echo "Upload du build standalone..."
tar czf /tmp/standalone.tar.gz -C "$APP_DIR/.next" standalone
aws s3 cp /tmp/standalone.tar.gz "s3://${BUCKET}/build/standalone.tar.gz" --region "$REGION"
STANDALONE_SIZE=$(du -h /tmp/standalone.tar.gz | cut -f1)
rm -f /tmp/standalone.tar.gz
echo "  standalone.tar.gz ($STANDALONE_SIZE) uploadé"

# Upload des static files
echo "Upload des static files..."
tar czf /tmp/static.tar.gz -C "$APP_DIR/.next" static
aws s3 cp /tmp/static.tar.gz "s3://${BUCKET}/build/static.tar.gz" --region "$REGION"
STATIC_SIZE=$(du -h /tmp/static.tar.gz | cut -f1)
rm -f /tmp/static.tar.gz
echo "  static.tar.gz ($STATIC_SIZE) uploadé"

# Upload du dossier public
echo "Upload des assets publics..."
tar czf /tmp/public.tar.gz -C "$APP_DIR" public
aws s3 cp /tmp/public.tar.gz "s3://${BUCKET}/build/public.tar.gz" --region "$REGION"
PUBLIC_SIZE=$(du -h /tmp/public.tar.gz | cut -f1)
rm -f /tmp/public.tar.gz
echo "  public.tar.gz ($PUBLIC_SIZE) uploadé"

echo ""
echo "=== Sync terminé ==="
echo "Bucket: s3://${BUCKET}/build/"
echo "L'EC2 failover utilisera ce build au prochain démarrage."
