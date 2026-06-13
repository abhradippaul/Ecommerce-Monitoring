output "iam_user_arn" {
  value       = module.iam_user.iam_user_arn
  description = "IAM User ARN"
}

output "iam_user_access_key" {
  value       = module.iam_user.iam_user_access_key_id
  description = "IAM User Access Key"
}

output "iam_user_secret_key" {
  value       = module.iam_user.iam_user_secret_key
  description = "IAM User Secret Key"
  sensitive   = true
}
