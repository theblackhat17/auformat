# Script de Presentation - Infrastructure Au Format

---

## SLIDE 1 : Page de titre

**Au Format - Architecture Infrastructure**
Haute disponibilite, failover automatique et monitoring

---

## SLIDE 2 : Vue d'ensemble

**L'infrastructure repose sur deux environnements :**

- **Proxmox (serveur maison)** : serveur principal qui heberge l'application en production au quotidien. C'est un conteneur LXC Debian 13 qui tourne sur un hyperviseur Proxmox VE.
- **AWS (cloud)** : environnement de secours (failover) qui prend le relais automatiquement en cas de panne du serveur principal. Il reste eteint en temps normal pour minimiser les couts (~0.81 EUR/mois).

Le tout est orchestre par Cloudflare qui gere le DNS, le SSL et la protection DDoS.

---

## SLIDE 3 : Proxmox - Conteneur LXC

**Environnement principal (LXC Debian 13 sur Proxmox VE)**

Le serveur maison tourne dans un conteneur LXC sur un hyperviseur Proxmox. Ce conteneur heberge l'integralite de la stack applicative :

| Composant | Detail |
|-----------|--------|
| **OS** | Debian 13 (Trixie) - conteneur LXC |
| **Application** | Next.js (standalone build) sur le port 3006 |
| **Process Manager** | PM2 - gere le process Node.js, redemarrage auto, logs |
| **Reverse Proxy** | Nginx - ecoute sur le port 80, proxy vers Next.js (port 3006) |
| **Base de donnees** | PostgreSQL 17 - stocke toutes les donnees de l'application |
| **Analytics** | Umami (conteneur Docker) - analytics self-hosted sur le port 3001 |
| **Tunnel** | Cloudflare Tunnel (cloudflared) - expose le serveur sans ouvrir de ports |
| **Monitoring** | Node Exporter (Prometheus) + Promtail (envoi des logs vers Loki/Grafana) |
| **Runtime** | Node.js 20 |

**Flux reseau sur le Proxmox :**
1. Les utilisateurs accedent a `auformat.com` via Cloudflare
2. Cloudflare route le trafic via un **Cloudflare Tunnel** (pas de port ouvert sur le routeur)
3. Le tunnel arrive sur le daemon `cloudflared` dans le conteneur LXC
4. `cloudflared` transmet a **Nginx** (port 80)
5. Nginx sert les fichiers statiques directement et proxy le reste vers **Next.js** (port 3006)
6. Nginx proxy aussi les requetes `/umami/` vers **Umami** (port 3001)

---

## SLIDE 4 : Proxmox - Configuration Nginx

**Nginx joue un role central comme reverse proxy :**

- **Fichiers statiques** (`/_next/static/`) : servis directement depuis le filesystem avec cache immutable (365 jours)
- **Images uploadees** (`/img/uploads/`) : servies directement, cache 30 jours
- **Umami Analytics** (`/umami/`) : proxy vers le conteneur Docker Umami sur le port 3001
- **Application Next.js** (`/`) : proxy vers PM2/Node.js sur le port 3006
- **Compression Gzip** activee sur tous les types de contenu
- **Headers de securite** : X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- **Taille max upload** : 10 Mo

---

## SLIDE 5 : Proxmox - Umami Analytics

**Umami : analytics self-hosted, alternative a Google Analytics**

- Tourne dans un **conteneur Docker** sur le serveur maison
- Base de donnees **PostgreSQL dediee** (separee de l'app principale)
- Interface accessible via `/umami/` grace au proxy Nginx
- **Respect du RGPD** : aucun cookie, aucune donnee personnelle collectee
- Script de tracking renomme (`stats.js`) pour eviter les ad-blockers
- Health check integre toutes les 10 secondes

---

## SLIDE 6 : Proxmox - Monitoring

**Stack de monitoring :**

- **Node Exporter** : exporte les metriques systeme (CPU, RAM, disque, reseau) au format Prometheus
- **Promtail** : collecte les logs de l'application et les envoie vers un serveur Loki/Grafana
- Les metriques et logs sont consultables dans un **dashboard Grafana**

---

## SLIDE 7 : Proxmox - Crons et scripts

**Deux taches cron critiques tournent sur le serveur maison :**

| Cron | Frequence | Script | Role |
|------|-----------|--------|------|
| **Heartbeat** | Toutes les 2 minutes | `heartbeat.sh` | Ecrit un timestamp dans S3 pour prouver que le serveur est vivant |
| **Backup DB** | Toutes les 15 minutes | `backup-db.sh` | `pg_dump` compresse (gzip) uploade vers S3 (latest + archive horodatee) |

Un troisieme script, `sync-build.sh`, est execute manuellement apres chaque deploiement pour synchroniser le build Next.js (standalone + static + public) vers S3.

---

## SLIDE 8 : AWS - Vue d'ensemble des services

**7 services AWS utilises, tous deployes avec Terraform (Infrastructure as Code) :**

| Service | Usage | Configuration |
|---------|-------|---------------|
| **EC2** | Instance de failover | t4g.micro (ARM64), Amazon Linux 2023, 30 Go gp3 chiffre, stoppee par defaut |
| **S3** | Stockage des backups et heartbeat | Versioning active, chiffrement AES256, acces public bloque, lifecycle 7j sur archives |
| **Lambda** | Logique de failover | Node.js 22, 128 Mo RAM, timeout 6 min, declenchee toutes les 2 min |
| **EventBridge** | Scheduler | Regle `rate(2 minutes)` qui invoque la Lambda |
| **CloudWatch** | Alertes | 2 alarmes : EC2 running > 2h + cout > 5 USD |
| **SNS** | Notifications | Topics d'alerte par email (Paris + us-east-1 pour billing) |
| **SSM Parameter Store** | Secrets | 13 parametres (DB, auth, SMTP, OAuth) dont 5 SecureString chiffres |
| **IAM** | Permissions | 2 roles (Lambda + EC2) avec politiques least-privilege |

---

## SLIDE 9 : AWS - Terraform (Infrastructure as Code)

**Toute l'infrastructure AWS est definie en Terraform :**

- **8 fichiers `.tf`** : main, ec2, s3, lambda, eventbridge, cloudwatch, iam, ssm
- **Region principale** : `eu-west-3` (Paris) + `us-east-1` (billing metrics)
- **Provider AWS** version ~> 5.0, Terraform >= 1.5
- **Variables sensibles** dans `terraform.tfvars` (gitignore)
- Un seul `terraform apply` deploie l'integralite de l'infrastructure
- **State file** local (terraform.tfstate)

Les avantages de Terraform :
- Infrastructure reproductible et versionnee
- Documentation vivante de l'infra
- Destruction propre avec `terraform destroy`

---

## SLIDE 10 : AWS - S3 en detail

**Bucket `auformat-failover-backups` :**

Structure du bucket :
```
s3://auformat-failover-backups/
  heartbeat.txt              <- timestamp mis a jour toutes les 2 min
  db/
    latest.sql.gz            <- dernier backup DB (ecrase a chaque fois)
    archive/
      20260305-1430.sql.gz   <- backups horodates (supprimes apres 7 jours)
    failover-latest.sql.gz   <- backup fait par l'EC2 pendant le failover
  build/
    standalone.tar.gz        <- build Next.js standalone
    static.tar.gz            <- fichiers statiques (_next/static)
    public.tar.gz            <- assets publics (images, etc.)
  scripts/
    on-boot.sh               <- script de demarrage EC2 (auto-update)
    backup-db-ec2.sh         <- script backup EC2
```

**Securite :**
- Acces public entierement bloque (4 regles)
- Chiffrement cote serveur AES256
- Versioning active
- Lifecycle : archives DB supprimees apres 7 jours, anciennes versions apres 3 jours

---

## SLIDE 11 : AWS - EC2 Failover

**Instance EC2 t4g.micro (ARM Graviton) :**

- **AMI** : Amazon Linux 2023 (ARM64)
- **Stockage** : 30 Go gp3 chiffre
- **Stoppee par defaut** (cout = 0.80 EUR/mois pour le disque EBS)
- **Security Group** : HTTP/HTTPS ouvert (Cloudflare proxied), SSH restreint a l'IP maison

**Setup initial (user-data, execute une seule fois) :**
1. Mise a jour systeme (`dnf update`)
2. Installation Node.js 22, PostgreSQL 16, Nginx, PM2, Git
3. Certificat SSL auto-signe (Cloudflare Full mode)
4. Configuration Nginx identique au serveur maison
5. Clone du repo GitHub
6. Service systemd `auformat-boot` pour le script on-boot

**A chaque demarrage (on-boot.sh) :**
1. Auto-update du script depuis S3
2. Recuperation des secrets depuis SSM Parameter Store -> `.env.local`
3. Restauration de la DB depuis le dernier backup S3
4. Telechargement du build (standalone + static + public) depuis S3
5. Activation du cron backup EC2 (toutes les 5 min)
6. Configuration Nginx + SSL
7. Demarrage de l'app avec PM2
8. Health check (12 tentatives, 5s entre chaque)

---

## SLIDE 12 : AWS - Lambda Failover Handler

**Fonction Lambda Node.js 22 - Cerveau du failover :**

La Lambda est invoquee toutes les 2 minutes par EventBridge et execute cette logique :

```
1. Verifier le heartbeat S3 (age du fichier heartbeat.txt)
2. Verifier l'etat du systeme (DNS Cloudflare + etat EC2)
3. Decider de l'action :

   SI serveur DOWN + pas en failover :
     -> Demarrer l'EC2
     -> Attendre que l'app reponde (health check toutes les 15s, max 5 min)
     -> Basculer le DNS : CNAME tunnel -> A record EC2
     = FAILOVER ACTIVE

   SI serveur UP + en failover :
     -> Backup final de la DB via SSM RunCommand
     -> Remettre le DNS : A record -> CNAME tunnel
     -> Attendre 30s (propagation DNS)
     -> Stopper l'EC2
     = FAILOVER DESACTIVE

   SI serveur UP + DNS stale (A record mais EC2 stoppee) :
     -> Nettoyer le DNS : remettre CNAME tunnel

   SINON : rien a faire
```

**Permissions IAM de la Lambda (least-privilege) :**
- EC2 : StartInstances, StopInstances (sur l'instance specifique), DescribeInstances
- S3 : GetObject, HeadObject (uniquement sur heartbeat.txt)
- SSM : SendCommand (pour le backup final), GetCommandInvocation
- CloudWatch Logs : ecriture des logs

---

## SLIDE 13 : AWS - CloudWatch et alertes

**Deux alarmes CloudWatch configurees :**

1. **EC2 running trop longtemps** (region Paris)
   - Se declenche si l'EC2 tourne depuis plus de 2h continues
   - Signifie que le failback a potentiellement echoue
   - 8 periodes de 15 minutes de CPUUtilization >= 0
   - Notification par email via SNS

2. **Cout AWS depasse 5 USD** (region us-east-1)
   - Surveille les EstimatedCharges toutes les 6h
   - Alerte des qu'on depasse le seuil
   - Notification par email via SNS (topic separe en us-east-1)

---

## SLIDE 14 : AWS - SSM Parameter Store

**13 secrets stockes dans AWS Systems Manager Parameter Store :**

| Parametre | Type | Usage |
|-----------|------|-------|
| `/auformat/DB_NAME` | String | Nom de la base PostgreSQL |
| `/auformat/DB_USER` | String | Utilisateur PostgreSQL |
| `/auformat/DB_PASSWORD` | SecureString | Mot de passe PostgreSQL (chiffre) |
| `/auformat/JWT_SECRET` | SecureString | Secret JWT pour l'authentification |
| `/auformat/BETTER_AUTH_SECRET` | SecureString | Secret Better Auth |
| `/auformat/SMTP_HOST` | String | Serveur SMTP (ProtonMail) |
| `/auformat/SMTP_PORT` | String | Port SMTP (587) |
| `/auformat/SMTP_USER` | String | Utilisateur SMTP |
| `/auformat/SMTP_PASS` | SecureString | Mot de passe SMTP (chiffre) |
| `/auformat/SMTP_FROM` | String | Adresse expediteur |
| `/auformat/GOOGLE_CLIENT_ID` | String | OAuth Google |
| `/auformat/GOOGLE_CLIENT_SECRET` | SecureString | Secret OAuth Google (chiffre) |
| `/auformat/NEXT_PUBLIC_APP_URL` | String | URL publique de l'app |
| `/auformat/BETTER_AUTH_URL` | String | URL Better Auth |
| `/auformat/BACKUP_BUCKET` | String | Nom du bucket S3 |

L'EC2 lit ces parametres au demarrage pour generer le fichier `.env.local`.
Les SecureString sont chiffres avec la cle KMS par defaut d'AWS.

---

## SLIDE 15 : AWS - IAM (Permissions)

**Deux roles IAM avec le principe du moindre privilege :**

**Role Lambda :**
- `sts:AssumeRole` pour le service Lambda
- EC2 : Start/Stop sur l'instance specifique, Describe sur toutes
- S3 : GetObject/HeadObject uniquement sur `heartbeat.txt`
- SSM : SendCommand vers l'EC2 + GetCommandInvocation
- CloudWatch Logs : politique managee AWS

**Role EC2 :**
- `sts:AssumeRole` pour le service EC2
- S3 : GetObject, ListBucket, PutObject sur le bucket de backups
- SSM : GetParameter, GetParametersByPath sur `/auformat/*`
- SSM Managed Instance Core (politique managee AWS pour SSM Agent)

---

## SLIDE 16 : Cloudflare - Le chef d'orchestre

**Cloudflare est le point d'entree unique pour les utilisateurs :**

- **DNS** : gere le record `auformat.com` (CNAME tunnel en temps normal, A record EC2 en failover)
- **Cloudflare Tunnel** : connexion securisee entre le serveur maison et Cloudflare sans ouvrir de ports
- **SSL/TLS** : mode Full - chiffrement de bout en bout (auto-signe accepte cote origin)
- **Proxy** : masque l'IP reelle du serveur, protection DDoS
- **TTL DNS** : 60 secondes pour un basculement rapide

La Lambda modifie le record DNS via l'API Cloudflare :
- **Mode normal** : `auformat.com` -> CNAME `xxxxx.cfargotunnel.com` (tunnel)
- **Mode failover** : `auformat.com` -> A `<IP publique EC2>` (direct)

---

## SLIDE 17 : Scenario de failover complet

**Chronologie d'une panne et du retour :**

```
T+0min   : Le serveur maison tombe (plus de heartbeat envoye)
T+2min   : Le heartbeat S3 a 2 min, la Lambda ne fait rien (< 5 min)
T+4min   : Le heartbeat a 4 min, toujours < 5 min, pas d'action
T+6min   : Le heartbeat a 6 min, > 5 min -> FAILOVER DEMARRE
           Lambda demarre l'EC2
T+7min   : EC2 en etat "running", on-boot.sh s'execute
           - Recuperation secrets SSM
           - Restore DB depuis S3
           - Telechargement build depuis S3
           - Demarrage PM2 + Nginx
T+9min   : Health check OK, Lambda bascule le DNS vers l'EC2
           Les utilisateurs sont rediriges vers AWS
           (Perte de donnees max : 15 min de backup DB)

--- Le serveur maison revient ---

T+Xmin   : Le serveur maison reenvoie un heartbeat
T+X+2min : Lambda detecte heartbeat frais + systeme en failover
           -> Backup final de la DB EC2 via SSM
           -> DNS remis vers le Cloudflare Tunnel
           -> Attente 30s
           -> EC2 stoppee
           Les utilisateurs reviennent sur le serveur maison

T+X+3min : Script restore-after-failover.sh sur le serveur maison
           Compare les dates de backup et restaure si le failover
           a des donnees plus recentes
```

---

## SLIDE 18 : Couts

**Cout mensuel en fonctionnement normal (serveur UP) :**

| Service | Cout/mois |
|---------|-----------|
| S3 (heartbeat + backups ~quelques Mo) | ~0.01 EUR |
| EBS 30 Go gp3 (EC2 stoppee) | ~2.40 EUR |
| Lambda (~21 600 invocations/mois) | ~0 EUR (free tier) |
| EventBridge | ~0 EUR |
| CloudWatch | ~0 EUR |
| SSM Parameter Store | ~0 EUR |
| **Total** | **~2.41 EUR/mois** |

**Pendant un failover :** +~0.10 EUR/jour pour l'EC2 t4g.micro running.
Alerte configuree si le cout depasse 5 USD/mois.

---

## SLIDE 19 : Resume technique

| Aspect | Choix technique | Justification |
|--------|----------------|---------------|
| Hebergement principal | LXC sur Proxmox | Legerete, isolation, performances proches du bare-metal |
| Acces externe | Cloudflare Tunnel | Zero port ouvert, SSL gratuit, protection DDoS |
| Application | Next.js standalone + PM2 | SSR performant, restart auto, logs structures |
| Base de donnees | PostgreSQL 17 | Robuste, open-source, backup facile avec pg_dump |
| Analytics | Umami (Docker) | Self-hosted, RGPD, leger |
| Monitoring | Node Exporter + Promtail | Metriques et logs centralises dans Grafana |
| IaC | Terraform | Infrastructure reproductible, versionnee |
| Failover | Lambda + EventBridge | Serverless, cout quasi-nul, execution toutes les 2 min |
| Secrets | SSM Parameter Store | Chiffrement KMS, acces IAM granulaire |
| Backups | S3 avec lifecycle | Versioning, chiffrement, retention automatique |
| Reverse proxy | Nginx | Performance, cache statique, headers securite |
| Emails | ProtonMail SMTP | Securise, bonne delivrabilite |
| Auth | Better Auth + Google OAuth | Moderne, simple, social login |

---

## SLIDE 20 : Questions ?

Points forts de cette architecture :
- **Resilience** : failover automatique en ~3 minutes
- **Economie** : ~2.41 EUR/mois en fonctionnement normal
- **Securite** : zero port ouvert, secrets chiffres, permissions minimales
- **Automatisation** : Terraform + scripts + Lambda, zero intervention manuelle
- **Monitoring** : alertes email, logs centralises, analytics self-hosted
