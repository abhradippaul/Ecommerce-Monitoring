output "bucket_id" {
  description = "The ID/Name of the bucket."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "The ARN of the bucket."
  value       = aws_s3_bucket.this.arn
}

output "bucket_endpoint" {
  description = "The endpoint of the bucket."
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "bucket_domain_name" {
  description = "The domain name of the bucket."
  value       = aws_s3_bucket.this.bucket_domain_name
}

output "bucket_name" {
  description = "The bucket name."
  value       = aws_s3_bucket.this.bucket
}
