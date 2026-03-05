# AMI Amazon Linux 2023 (ARM64 pour t4g)
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Plages IP Cloudflare pour restreindre l'accès HTTP
# https://www.cloudflare.com/ips/
data "aws_ec2_managed_prefix_list" "cloudflare" {
  count = 0 # Pas de prefix list managée par AWS pour Cloudflare
}

# Key pair SSH
resource "aws_key_pair" "failover" {
  key_name   = "${var.project_tag}-key"
  public_key = var.ssh_public_key

  tags = {
    Project = var.project_tag
  }
}

# Security Group
resource "aws_security_group" "failover" {
  name        = "${var.project_tag}-sg"
  description = "Security group pour EC2 failover Au Format"

  # HTTP depuis partout (Cloudflare proxy, les IPs source sont celles de CF)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS depuis partout (Cloudflare Full SSL mode)
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH restreint à l'IP maison
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_ip]
  }

  # Tout le trafic sortant
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_tag}-sg"
    Project = var.project_tag
  }
}

# Instance EC2 failover
resource "aws_instance" "failover" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t4g.micro"
  key_name               = aws_key_pair.failover.key_name
  vpc_security_group_ids = [aws_security_group.failover.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/../scripts/setup-ec2.sh", {
    db_name     = var.db_name
    db_user     = var.db_user
    db_password = var.db_password
    github_repo = var.github_repo
    bucket_name = var.backup_bucket_name
    aws_region  = var.aws_region
  })

  tags = {
    Name     = "${var.project_tag}-ec2"
    Project  = var.project_tag
    AutoStop = "true"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}
