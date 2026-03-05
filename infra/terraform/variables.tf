variable "aws_region" {
  description = "Région AWS principale"
  type        = string
  default     = "eu-west-3" # Paris
}

variable "domain_name" {
  description = "Nom de domaine du site"
  type        = string
  default     = "auformat.com"
}

# --- Cloudflare ---

variable "cloudflare_zone_id" {
  description = "Zone ID Cloudflare (Dashboard > auformat.com > Overview > Zone ID)"
  type        = string
}

variable "cloudflare_api_token" {
  description = "API Token Cloudflare avec permissions DNS:Edit sur la zone"
  type        = string
  sensitive   = true
}

variable "cloudflare_record_id" {
  description = "ID du CNAME record du tunnel dans Cloudflare"
  type        = string
}

variable "tunnel_cname" {
  description = "CNAME du Cloudflare Tunnel (ex: xxxxx.cfargotunnel.com)"
  type        = string
}

# --- Heartbeat ---

variable "heartbeat_max_age_seconds" {
  description = "Âge maximum du heartbeat en secondes avant de déclencher le failover"
  type        = number
  default     = 300 # 5 minutes
}

# --- EC2 ---

variable "ssh_public_key" {
  description = "Clé publique SSH pour accès EC2"
  type        = string
}

variable "ssh_allowed_ip" {
  description = "IP autorisée pour SSH (ton IP maison, format CIDR: x.x.x.x/32)"
  type        = string
}

# --- Base de données ---

variable "db_name" {
  description = "Nom de la base de données PostgreSQL"
  type        = string
  default     = "auformat_db"
}

variable "db_user" {
  description = "Utilisateur PostgreSQL"
  type        = string
  default     = "auformat_user"
}

variable "db_password" {
  description = "Mot de passe PostgreSQL"
  type        = string
  sensitive   = true
}

# --- App secrets ---

variable "jwt_secret" {
  description = "JWT_SECRET pour l'authentification"
  type        = string
  sensitive   = true
}

variable "better_auth_secret" {
  description = "BETTER_AUTH_SECRET"
  type        = string
  sensitive   = true
}

variable "smtp_host" {
  description = "Serveur SMTP"
  type        = string
  default     = "smtp.protonmail.ch"
}

variable "smtp_port" {
  description = "Port SMTP"
  type        = string
  default     = "587"
}

variable "smtp_user" {
  description = "Utilisateur SMTP"
  type        = string
  default     = "contact@auformat.com"
}

variable "smtp_pass" {
  description = "Mot de passe SMTP"
  type        = string
  sensitive   = true
}

variable "smtp_from" {
  description = "Adresse expéditeur SMTP"
  type        = string
  default     = "contact@auformat.com"
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

# --- GitHub ---

variable "github_repo" {
  description = "URL du repo GitHub (HTTPS)"
  type        = string
  default     = "https://github.com/theblackhat17/auformat.git"
}

# --- S3 ---

variable "backup_bucket_name" {
  description = "Nom du bucket S3 pour les backups (doit être unique globalement)"
  type        = string
  default     = "auformat-failover-backups"
}

# --- Alerting ---

variable "alert_email" {
  description = "Email pour recevoir les alertes CloudWatch"
  type        = string
}

# --- Tags ---

variable "project_tag" {
  description = "Tag projet pour toutes les ressources"
  type        = string
  default     = "auformat-failover"
}
