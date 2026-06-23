output "iam_user_arn" {
  value       = aws_iam_user.iam_user.arn
  description = "IAM User ARN"
}

output "iam_user_access_key_id" {
  value       = aws_iam_access_key.iam_user.id
  description = "IAM User Access Key ID"
}

output "iam_user_secret_key" {
  value       = aws_iam_access_key.iam_user.secret
  description = "IAM User Secret Key"
  sensitive   = true
}
