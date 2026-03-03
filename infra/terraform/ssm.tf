# Secrets de l'application stockés dans SSM Parameter Store
# L'EC2 les lit au boot pour générer le .env.local

# --- Database ---

resource "aws_ssm_parameter" "db_name" {
  name  = "/auformat/DB_NAME"
  type  = "String"
  value = var.db_name

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "db_user" {
  name  = "/auformat/DB_USER"
  type  = "String"
  value = var.db_user

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/auformat/DB_PASSWORD"
  type  = "SecureString"
  value = var.db_password

  tags = { Project = var.project_tag }
}

# --- Auth ---

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/auformat/JWT_SECRET"
  type  = "SecureString"
  value = var.jwt_secret

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "better_auth_secret" {
  name  = "/auformat/BETTER_AUTH_SECRET"
  type  = "SecureString"
  value = var.better_auth_secret

  tags = { Project = var.project_tag }
}

# --- SMTP ---

resource "aws_ssm_parameter" "smtp_host" {
  name  = "/auformat/SMTP_HOST"
  type  = "String"
  value = var.smtp_host

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "smtp_port" {
  name  = "/auformat/SMTP_PORT"
  type  = "String"
  value = var.smtp_port

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "smtp_user" {
  name  = "/auformat/SMTP_USER"
  type  = "String"
  value = var.smtp_user

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "smtp_pass" {
  name  = "/auformat/SMTP_PASS"
  type  = "SecureString"
  value = var.smtp_pass

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "smtp_from" {
  name  = "/auformat/SMTP_FROM"
  type  = "String"
  value = var.smtp_from

  tags = { Project = var.project_tag }
}

# --- Google OAuth ---

resource "aws_ssm_parameter" "google_client_id" {
  name  = "/auformat/GOOGLE_CLIENT_ID"
  type  = "String"
  value = var.google_client_id

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "google_client_secret" {
  name  = "/auformat/GOOGLE_CLIENT_SECRET"
  type  = "SecureString"
  value = var.google_client_secret

  tags = { Project = var.project_tag }
}

# --- App ---

resource "aws_ssm_parameter" "app_url" {
  name  = "/auformat/NEXT_PUBLIC_APP_URL"
  type  = "String"
  value = "https://${var.domain_name}"

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "better_auth_url" {
  name  = "/auformat/BETTER_AUTH_URL"
  type  = "String"
  value = "https://${var.domain_name}"

  tags = { Project = var.project_tag }
}

resource "aws_ssm_parameter" "bucket_name" {
  name  = "/auformat/BACKUP_BUCKET"
  type  = "String"
  value = var.backup_bucket_name

  tags = { Project = var.project_tag }
}
