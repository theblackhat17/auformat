# Bucket S3 pour les backups DB et le build standalone
resource "aws_s3_bucket" "backups" {
  bucket = var.backup_bucket_name

  tags = {
    Name    = "${var.project_tag}-backups"
    Project = var.project_tag
  }
}

# Versioning activé pour pouvoir récupérer d'anciennes versions
resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Chiffrement côté serveur
resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bloquer tout accès public
resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle : supprimer les archives DB après 7 jours
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "cleanup-old-db-archives"
    status = "Enabled"

    filter {
      prefix = "db/archive/"
    }

    expiration {
      days = 7
    }
  }

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 3
    }
  }
}
