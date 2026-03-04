# Archive ZIP du code Lambda
data "archive_file" "failover_handler" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/failover-handler"
  output_path = "${path.module}/../lambda/failover-handler.zip"
}

# Fonction Lambda failover (même région que l'EC2)
resource "aws_lambda_function" "failover_handler" {
  function_name = "${var.project_tag}-handler"
  description   = "Vérifie le heartbeat et gère le failover Au Format"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 360
  memory_size   = 128

  filename         = data.archive_file.failover_handler.output_path
  source_code_hash = data.archive_file.failover_handler.output_base64sha256

  environment {
    variables = {
      EC2_INSTANCE_ID            = aws_instance.failover.id
      EC2_REGION                 = var.aws_region
      BUCKET_NAME                = aws_s3_bucket.backups.id
      CLOUDFLARE_ZONE_ID         = var.cloudflare_zone_id
      CLOUDFLARE_TOKEN           = var.cloudflare_api_token
      CLOUDFLARE_RECORD_ID       = var.cloudflare_record_id
      DOMAIN_NAME                = var.domain_name
      TUNNEL_CNAME               = var.tunnel_cname
      HEARTBEAT_MAX_AGE_SECONDS  = tostring(var.heartbeat_max_age_seconds)
    }
  }

  tags = {
    Project = var.project_tag
  }
}
