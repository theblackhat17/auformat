# =============================================================================
# CloudWatch Alerting - Surcoût failover
# =============================================================================

# --- SNS Topic pour les alertes ---

resource "aws_sns_topic" "alerts" {
  name = "${var.project_tag}-alerts"

  tags = {
    Project = var.project_tag
  }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# --- Alerte : EC2 running > 2h (failback potentiellement raté) ---
# CPUUtilization n'émet des données que quand l'instance tourne.
# 8 périodes de 15 min = 2h de fonctionnement continu.

resource "aws_cloudwatch_metric_alarm" "ec2_running_too_long" {
  alarm_name          = "${var.project_tag}-ec2-running-too-long"
  alarm_description   = "EC2 failover tourne depuis plus de 2h - failback peut-etre rate"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 8
  period              = 900 # 15 min
  threshold           = 0
  treat_missing_data  = "notBreaching" # Pas de données = instance arrêtée = OK

  namespace   = "AWS/EC2"
  metric_name = "CPUUtilization"
  statistic   = "Average"

  dimensions = {
    InstanceId = aws_instance.failover.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Project = var.project_tag
  }
}

# --- Alerte : Coût estimé > 5 EUR ---
# Les métriques de billing ne sont disponibles que dans us-east-1.

resource "aws_sns_topic" "billing_alerts" {
  provider = aws.us_east_1
  name     = "${var.project_tag}-billing-alerts"

  tags = {
    Project = var.project_tag
  }
}

resource "aws_sns_topic_subscription" "billing_email" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "billing_threshold" {
  provider = aws.us_east_1

  alarm_name          = "${var.project_tag}-billing-over-5eur"
  alarm_description   = "Cout estime AWS depasse 5 EUR ce mois-ci"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  period              = 21600 # 6h (billing est mis à jour toutes les ~6h)
  threshold           = 5
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/Billing"
  metric_name = "EstimatedCharges"
  statistic   = "Maximum"

  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [aws_sns_topic.billing_alerts.arn]

  tags = {
    Project = var.project_tag
  }
}
