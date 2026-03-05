terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Provider principal - Paris
provider "aws" {
  region = var.aws_region
}

# Provider us-east-1 (requis pour les métriques de billing)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
