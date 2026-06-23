module "iam_user" {
  source       = "./module/iam"
  environment  = var.environment
  project_name = var.project_name
}

# terraform plan -var-file=dev.tfvars
