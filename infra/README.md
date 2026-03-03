# Infrastructure Failover AWS - Au Format

Architecture de failover automatique pour auformat.com.
Quand le serveur maison tombe, AWS prend le relais en ~3 minutes.
Coût mensuel normal : ~0.81€/mois.

## Architecture

```
Cloudflare Tunnel (DNS + SSL) → Serveur maison (primary)
                              → EC2 AWS (failover, stoppé par défaut)

Heartbeat cron (2 min) → S3 → EventBridge (2 min) → Lambda vérifie
  Si heartbeat périmé → Start EC2 + DNS CNAME→A record (EC2 IP)
  Si heartbeat frais  → DNS A record→CNAME tunnel + Stop EC2
```

## Prérequis

1. **Compte AWS** avec un IAM user (AdministratorAccess)
2. **Terraform** installé
3. **AWS CLI** configuré (`aws configure`)

## Étape 1 : Récupérer les infos Cloudflare

1. **Zone ID** : Dashboard → auformat.com → Overview → colonne droite
2. **API Token** : My Profile → API Tokens → Create Token → "Edit zone DNS"
3. **Record ID** du CNAME tunnel :
   ```bash
   curl -s -X GET "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records?type=CNAME&name=auformat.com" \
     -H "Authorization: Bearer TOKEN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result'][0]['id'])"
   ```

## Étape 2 : Configurer Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars   # remplir toutes les valeurs
```

**Important** : Ne jamais committer `terraform.tfvars` (contient des secrets).

## Étape 3 : Déployer

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

Terraform crée :
- 1 Bucket S3 (backups)
- 1 Instance EC2 t4g.micro (avec setup automatique)
- 1 Fonction Lambda (vérifie heartbeat toutes les 2 min)
- 1 Règle EventBridge (schedule)
- Les rôles IAM + paramètres SSM

## Étape 4 : Vérifier l'EC2

L'EC2 démarre automatiquement pour le setup initial (~5 min).

```bash
INSTANCE_ID=$(terraform output -raw ec2_instance_id)

# Vérifier le statut
aws ec2 describe-instances --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].{State:State.Name,IP:PublicIpAddress}'

# SSH
ssh -i ~/.ssh/auformat-ec2 ec2-user@<IP>

# Vérifier les logs
sudo cat /var/log/auformat-setup.log

# Vérifier les installations
node --version && psql --version && pm2 --version && nginx -v
```

Stopper une fois vérifié :
```bash
aws ec2 stop-instances --instance-ids $INSTANCE_ID
```

## Étape 5 : Configurer les crons (serveur maison)

```bash
# Heartbeat toutes les 2 minutes
echo "*/2 * * * * root /opt/auformat-next/infra/scripts/heartbeat.sh" | sudo tee /etc/cron.d/auformat-heartbeat

# Backup DB toutes les 15 minutes
echo "*/15 * * * * root /opt/auformat-next/infra/scripts/backup-db.sh" | sudo tee /etc/cron.d/auformat-backup

# Premier run manuel
bash /opt/auformat-next/infra/scripts/heartbeat.sh
sudo /opt/auformat-next/infra/scripts/backup-db.sh
bash /opt/auformat-next/infra/scripts/sync-build.sh
```

## Étape 6 : Tester le failover

```bash
# 1. Stopper le heartbeat pour simuler une panne
sudo rm /etc/cron.d/auformat-heartbeat

# 2. Attendre ~6 minutes (heartbeat expire après 5 min + check Lambda 2 min)

# 3. Vérifier que l'EC2 a démarré
aws ec2 describe-instances --filters "Name=tag:Name,Values=auformat-failover-ec2" \
  --query 'Reservations[0].Instances[0].State.Name'

# 4. Remettre le heartbeat
echo "*/2 * * * * root /opt/auformat-next/infra/scripts/heartbeat.sh" | sudo tee /etc/cron.d/auformat-heartbeat
bash /opt/auformat-next/infra/scripts/heartbeat.sh

# 5. Attendre ~4 minutes → Lambda stoppe l'EC2 et remet le DNS
```

## Commandes utiles

```bash
# État de l'infra
cd infra/terraform && terraform output

# Voir les backups
aws s3 ls s3://auformat-failover-backups/db/ --region eu-west-3
aws s3 ls s3://auformat-failover-backups/build/ --region eu-west-3

# Forcer un backup
sudo /opt/auformat-next/infra/scripts/backup-db.sh

# Sync le build après un deploy
bash /opt/auformat-next/infra/scripts/sync-build.sh

# Logs
cat /var/log/auformat/backup.log

# EC2 manuelle
INSTANCE_ID=$(cd infra/terraform && terraform output -raw ec2_instance_id)
aws ec2 start-instances --instance-ids $INSTANCE_ID
aws ec2 stop-instances --instance-ids $INSTANCE_ID
```

## Coûts

| Service | Coût/mois (serveur UP) |
|---------|------------------------|
| S3 (backups + heartbeat) | ~0.01€ |
| EBS 10GB gp3 (EC2 stoppé) | ~0.80€ |
| Lambda + EventBridge | ~0€ |
| **Total** | **~0.81€/mois** |

Pendant un failover : +~0.10€/jour pour l'EC2 t4g.micro.

## Fichiers

```
infra/
├── terraform/           # Infrastructure as Code
├── lambda/
│   └── failover-handler/
│       └── index.mjs    # Vérifie heartbeat + start/stop EC2 + update DNS
├── scripts/
│   ├── setup-ec2.sh     # Setup initial EC2 (user-data)
│   ├── on-boot.sh       # Au boot: restore DB + build + start app
│   ├── heartbeat.sh     # Cron 2min: preuve de vie → S3
│   ├── backup-db.sh     # Cron 15min: pg_dump → S3
│   └── sync-build.sh    # Post-deploy: build → S3
└── README.md
```
