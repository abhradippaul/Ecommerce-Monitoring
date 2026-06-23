terraform {
  backend "s3" {
    bucket       = "abhradip-terraform-state-bucket"
    key          = "ecommerce-monitoring/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}
