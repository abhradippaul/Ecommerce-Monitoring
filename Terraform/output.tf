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

output "s3_bucket_endpoint" {
  value       = module.s3_bucket.bucket_endpoint
  description = "S3 Bucket Endpoint"
}

output "s3_bucket_domain_name" {
  value       = module.s3_bucket.bucket_domain_name
  description = "S3 Bucket Domain Name"
}

output "s3_bucket_name" {
  value       = module.s3_bucket.bucket_name
  description = "S3 Bucket Name"
}
