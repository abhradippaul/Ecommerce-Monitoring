# output "iam_user_arn" {
#   value       = module.iam_user.iam_user_arn
#   description = "IAM User ARN"
# }

# output "iam_user_access_key" {
#   value       = module.iam_user.iam_user_access_key_id
#   description = "IAM User Access Key"
# }

# output "iam_user_secret_key" {
#   value       = module.iam_user.iam_user_secret_key
#   description = "IAM User Secret Key"
#   sensitive   = true
# }

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
