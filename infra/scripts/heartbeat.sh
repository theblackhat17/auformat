#!/bin/bash
# ==============================================================
# Heartbeat → S3 (cron sur le serveur maison)
# Cron: */2 * * * * root /opt/auformat-next/infra/scripts/heartbeat.sh
# Écrit un timestamp dans S3 pour prouver que le serveur est vivant
# ==============================================================

BUCKET="auformat-failover-backups"
REGION="eu-west-3"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" | /usr/local/bin/aws s3 cp - "s3://${BUCKET}/heartbeat.txt" --region "$REGION" --quiet 2>/dev/null
