module "github_oidc" {
  source = "./module/github-oidc"

  github_repositories = var.github_repositories
}

# terraform plan -var-file=dev.tfvars
