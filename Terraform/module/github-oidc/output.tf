output "aws_iam_openid_connect_provider_arn" {
  value = aws_iam_openid_connect_provider.github_actions.arn
}

output "aws_iam_role_name" {
  value = aws_iam_role.github_actions_ecom_deploy_role.name
}

output "aws_iam_role_arn" {
  value = aws_iam_role.github_actions_ecom_deploy_role.arn
}

output "aws_iam_policy_name" {
  value = aws_iam_policy.github_actions_ecom_policy.name
}
