output "aws_iam_openid_connect_provider_arn" {
  value = module.github_oidc.aws_iam_openid_connect_provider_arn
}

output "aws_iam_role_name" {
  value = module.github_oidc.aws_iam_role_name
}

output "aws_iam_policy_name" {
  value = module.github_oidc.aws_iam_policy_name
}
