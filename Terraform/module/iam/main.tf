resource "aws_iam_user" "iam_user" {
  name = "${var.project_name}-${var.environment}-iam-user"
  # path = "/system/"

  tags = {
    project_name = var.project_name
    environment  = var.environment
  }
}

resource "aws_iam_access_key" "iam_user" {
  user = aws_iam_user.iam_user.name
}

data "aws_iam_policy_document" "iam_user_ro" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = ["*"]
    # resources = ["arn:aws:secretsmanager:us-east-1:123456789012:secret:secretName-AbCdEf"]
  }
}

resource "aws_iam_user_policy" "iam_user_ro" {
  name   = "${var.project_name}-${var.environment}-iam-user-ro"
  user   = aws_iam_user.iam_user.name
  policy = data.aws_iam_policy_document.iam_user_ro.json
}
