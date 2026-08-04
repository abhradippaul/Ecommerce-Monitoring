resource "aws_s3_bucket" "this" {
  #checkov:skip=CKV_AWS_145: "Ensure that S3 buckets are encrypted with KMS by default - Default AES256 encryption is sufficient for app context"
  #checkov:skip=CKV2_AWS_61: "Ensure that an S3 bucket has a lifecycle configuration - Bucket lifecycle managed outside or not required"
  #checkov:skip=CKV_AWS_21: "Ensure all data stored in the S3 bucket have versioning enabled - Versioning disabled by design"
  #checkov:skip=CKV_AWS_144: "Ensure that S3 bucket has cross-region replication enabled - Cross-region replication disabled"
  #checkov:skip=CKV2_AWS_62: "Ensure S3 buckets should have event notifications enabled - Event notifications not required"
  bucket        = "${replace(var.project_name, "_", "-")}-${var.environment}-s3-bucket"
  force_destroy = var.environment == "dev" ? true : false

  tags = {
    Name         = "${var.project_name}-${var.environment}-s3-bucket"
    project_name = var.project_name
    environment  = var.environment
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "DELETE", "HEAD"]
    allowed_origins = ["http://localhost:80", "http://127.0.0.1:80", "http://localhost:3000", "http://127.0.0.1:3000"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
