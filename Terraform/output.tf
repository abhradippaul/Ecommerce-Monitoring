output "aws_iam_openid_connect_provider_arn" {
  value     = module.github_oidc.aws_iam_openid_connect_provider_arn
  sensitive = true
}

output "aws_iam_role_name" {
  value     = module.github_oidc.aws_iam_role_name
  sensitive = true
}

output "aws_iam_role_arn" {
  value     = module.github_oidc.aws_iam_role_arn
  sensitive = true
}

output "aws_iam_policy_name" {
  value     = module.github_oidc.aws_iam_policy_name
  sensitive = true
}
