# EventBridge : déclenche la Lambda toutes les 2 minutes
resource "aws_cloudwatch_event_rule" "failover_check" {
  name                = "${var.project_tag}-check"
  description         = "Vérifie le heartbeat du serveur maison toutes les 2 minutes"
  schedule_expression = "rate(2 minutes)"

  tags = {
    Project = var.project_tag
  }
}

resource "aws_cloudwatch_event_target" "failover_lambda" {
  rule = aws_cloudwatch_event_rule.failover_check.name
  arn  = aws_lambda_function.failover_handler.arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.failover_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.failover_check.arn
}
