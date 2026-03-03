output "ec2_instance_id" {
  description = "ID de l'instance EC2 failover"
  value       = aws_instance.failover.id
}

output "s3_bucket_name" {
  description = "Nom du bucket S3 de backups"
  value       = aws_s3_bucket.backups.id
}

output "lambda_function_name" {
  description = "Nom de la fonction Lambda failover"
  value       = aws_lambda_function.failover_handler.function_name
}

output "ec2_security_group_id" {
  description = "ID du security group EC2"
  value       = aws_security_group.failover.id
}

output "setup_instructions" {
  description = "Étapes suivantes après terraform apply"
  value       = <<-EOT

    ============================================
    INFRASTRUCTURE DÉPLOYÉE AVEC SUCCÈS
    ============================================

    Étapes suivantes :

    1. Attendre ~5 min que le user-data EC2 se termine

    2. SSH dans l'EC2 :
       ssh -i ~/.ssh/auformat-ec2 ec2-user@<IP_PUBLIQUE>

    3. Vérifier que le setup s'est bien passé :
       sudo cat /var/log/auformat-setup.log

    4. Configurer les crons sur le serveur maison :
       echo "*/2 * * * * root /opt/auformat-next/infra/scripts/heartbeat.sh" | sudo tee /etc/cron.d/auformat-heartbeat
       echo "*/15 * * * * root /opt/auformat-next/infra/scripts/backup-db.sh" | sudo tee /etc/cron.d/auformat-backup

    5. Premier backup + sync build :
       sudo /opt/auformat-next/infra/scripts/backup-db.sh
       bash /opt/auformat-next/infra/scripts/sync-build.sh
       bash /opt/auformat-next/infra/scripts/heartbeat.sh

    6. Stopper l'EC2 :
       aws ec2 stop-instances --instance-ids ${aws_instance.failover.id}

    Bucket S3 : ${aws_s3_bucket.backups.id}

  EOT
}
