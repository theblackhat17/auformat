#!/bin/bash
# ==============================================================
# Réinitialise le mot de passe admin d'Umami avec une valeur forte,
# le persiste dans .env.local (UMAMI_PASSWORD) et redémarre l'app.
# À lancer en root :  sudo bash infra/scripts/reset-umami-password.sh
# ==============================================================
set -euo pipefail
cd /opt/auformat-next

NEWPASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)
HASH=$(node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" "$NEWPASS")

echo "→ Mise à jour du hash dans la base Umami…"
sudo -u postgres psql umami -c "UPDATE \"user\" SET password='${HASH}' WHERE username='admin';"

echo "→ Vérification du login Umami…"
CODE=$(curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"admin\",\"password\":\"${NEWPASS}\"}" -o /dev/null -w "%{http_code}")
if [ "$CODE" != "200" ]; then echo "ERREUR: login Umami a répondu $CODE, abandon (rien d'autre modifié)"; exit 1; fi
echo "  login OK (200)"

echo "→ Persistance dans .env.local (UMAMI_PASSWORD)…"
cp .env.local ".env.local.bak-umami-$(date +%Y%m%d-%H%M%S)"
sed -i "s#^UMAMI_PASSWORD=.*#UMAMI_PASSWORD=${NEWPASS}#" .env.local
grep -q "^UMAMI_PASSWORD=${NEWPASS}$" .env.local && echo "  .env.local OK"

echo "→ Redémarrage de l'app (rechargement de l'environnement)…"
pm2 delete auformat >/dev/null 2>&1 || true
pm2 start ecosystem.config.js >/dev/null
sleep 3
pm2 list | grep -E "auformat.*online" >/dev/null && echo "  pm2 online"

echo ""
echo "✓ Terminé. Nouveau mot de passe Umami (garde-le si tu veux te connecter à /umami à la main) :"
echo "  admin / ${NEWPASS}"
echo "  (il est aussi dans .env.local → UMAMI_PASSWORD)"
