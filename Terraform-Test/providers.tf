terraform {
  required_version = ">= 1.15.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.50.0"
    }
  }
}


provider "aws" {
  region = "ap-south-1"

  default_tags {
    tags = {
      managedby = "terraform"
    }
  }
}
