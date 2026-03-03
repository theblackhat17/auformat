#!/bin/bash
# ==============================================================
# Setup EC2 failover - User Data (exécuté une seule fois au 1er boot)
# Installe: Node.js 22, PostgreSQL 16, Nginx, PM2, AWS CLI
# ==============================================================
set -euo pipefail
exec > >(tee /var/log/auformat-setup.log) 2>&1

echo "=== Au Format EC2 Setup - $(date) ==="

# Variables injectées par Terraform templatefile
DB_NAME="${db_name}"
DB_USER="${db_user}"
DB_PASSWORD="${db_password}"
GITHUB_REPO="${github_repo}"
BUCKET_NAME="${bucket_name}"
AWS_REGION="${aws_region}"

# --- 1. Mise à jour système ---
echo "[1/9] Mise à jour système..."
dnf update -y

# --- 2. Node.js 22 ---
echo "[2/9] Installation Node.js 22..."
dnf install -y nodejs22 nodejs22-npm
node --version
npm --version

# --- 3. PostgreSQL 16 ---
echo "[3/9] Installation PostgreSQL 16..."
dnf install -y postgresql16-server postgresql16
postgresql-setup --initdb

# Démarrer PostgreSQL avec peer auth pour le setup initial
systemctl enable postgresql
systemctl start postgresql

# Créer l'utilisateur et la base (avec peer auth pour postgres)
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo "PostgreSQL configuré: $DB_NAME / $DB_USER"

# Maintenant configurer md5 pour les connexions applicatives, garder peer pour postgres
sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /var/lib/pgsql/data/pg_hba.conf
sed -i '/^local   all             all                                     md5/i local   all             postgres                                peer' /var/lib/pgsql/data/pg_hba.conf
sed -i 's/host    all             all             127.0.0.1\/32            ident/host    all             all             127.0.0.1\/32            md5/' /var/lib/pgsql/data/pg_hba.conf
systemctl restart postgresql

# --- 4. PM2 ---
echo "[4/9] Installation PM2..."
npm install -g pm2

# --- 5. Nginx ---
echo "[5/9] Installation Nginx..."
dnf install -y nginx

# Configuration Nginx (identique au serveur maison)
cat > /etc/nginx/conf.d/auformat.conf << 'NGINX_CONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    location /_next/static/ {
        alias /opt/auformat-next/.next/static/;
        include /etc/nginx/mime.types;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /img/uploads/ {
        alias /opt/auformat-next/public/img/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    location /img/ {
        proxy_pass http://127.0.0.1:3006;
        expires 30d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;

        proxy_hide_header Cache-Control;
        add_header Cache-Control "private, no-cache, must-revalidate" always;
    }

    client_max_body_size 10M;
}
NGINX_CONF

# Supprimer la config par défaut si elle existe
rm -f /etc/nginx/conf.d/default.conf

systemctl enable nginx

# --- 6. Git + clone du repo ---
echo "[6/9] Clone du repo GitHub..."
dnf install -y git
mkdir -p /opt/auformat-next
git clone "$GITHUB_REPO" /opt/auformat-next || echo "Repo déjà cloné"

# --- 7. Créer les dossiers de logs ---
echo "[7/9] Création des dossiers..."
mkdir -p /var/log/auformat

# --- 8. Script on-boot en service systemd ---
echo "[8/9] Configuration du service on-boot..."
cat > /opt/auformat-next/infra/scripts/on-boot.sh << 'ONBOOT_SCRIPT_PLACEHOLDER'
#!/bin/bash
# Ce fichier sera remplacé par le vrai on-boot.sh depuis le repo
echo "on-boot.sh placeholder - le vrai script sera dans le repo"
ONBOOT_SCRIPT_PLACEHOLDER

# Copier le vrai on-boot.sh depuis le repo s'il existe
if [ -f /opt/auformat-next/infra/scripts/on-boot.sh ]; then
  chmod +x /opt/auformat-next/infra/scripts/on-boot.sh
fi

cat > /etc/systemd/system/auformat-boot.service << EOF
[Unit]
Description=Au Format - Restore DB and start app on boot
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/auformat-next/infra/scripts/on-boot.sh
RemainAfterExit=yes
StandardOutput=journal+console
StandardError=journal+console
Environment=AWS_DEFAULT_REGION=$AWS_REGION
Environment=BUCKET_NAME=$BUCKET_NAME
Environment=DB_NAME=$DB_NAME
Environment=DB_USER=$DB_USER

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable auformat-boot.service

# --- 9. Permissions ---
echo "[9/9] Configuration des permissions..."
chown -R ec2-user:ec2-user /opt/auformat-next
chown -R ec2-user:ec2-user /var/log/auformat

echo "=== Setup terminé - $(date) ==="
echo "L'instance est prête. Au prochain démarrage, on-boot.sh sera exécuté automatiquement."
