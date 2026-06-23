resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]

  tags = {
    Name = "GitHub-Actions-OIDC-Provider"
  }
}

# IAM Role
resource "aws_iam_role" "github_actions_ecom_deploy_role" {
  name = "GitHubActionsECOMDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              for repo in var.github_repositories :
              "repo:${repo.org}/${repo.repo}:${repo.branch}"
            ]
          }
        }
      }
    ]
  })

  tags = {
    Name = "GitHub-Actions-ECOM-Deploy-Role"
  }
}

resource "aws_iam_policy" "github_actions_ecom_policy" {
  name        = "GitHubActionsECOMPolicy"
  description = "Policy for GitHub Actions to access ECOM"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "arn:aws:s3:::abhradip-terraform-state-bucket/*"
      }
    ]
  })

  tags = {
    Name = "GitHub-Actions-ECOM-Policy"
  }
}

# Policy Attachment
resource "aws_iam_role_policy_attachment" "github_actions_ecom_policy_attachment" {
  role       = aws_iam_role.github_actions_ecom_deploy_role.name
  policy_arn = aws_iam_policy.github_actions_ecom_policy.arn
}
