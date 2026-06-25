# module "iam_user" {
#   source       = "./module/iam"
#   environment  = var.environment
#   project_name = var.project_name
# }

module "s3_bucket" {
  source       = "./module/s3"
  environment  = var.environment
  project_name = var.project_name
}
