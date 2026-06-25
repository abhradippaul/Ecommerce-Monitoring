module "github_oidc" {
  source = "./module/github-oidc"

  github_repositories = var.github_repositories
}

module "s3_bucket" {
  source       = "./module/s3"
  environment  = var.environment
  project_name = var.project_name
}

# terraform plan -var-file=dev.tfvars
