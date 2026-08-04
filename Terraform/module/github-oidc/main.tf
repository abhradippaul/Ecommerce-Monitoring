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
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::abhradip-terraform-state-bucket/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = "arn:aws:s3:::abhradip-terraform-state-bucket"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = [
          "arn:aws:s3:::ecommerce-monitoring*",
          "arn:aws:s3:::ecommerce-monitoring*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "iam:GetOpenIDConnectProvider",
          "iam:CreateOpenIDConnectProvider",
          "iam:DeleteOpenIDConnectProvider",
          "iam:UpdateOpenIDConnectProviderThumbprint",
          "iam:AddClientIDToOpenIDConnectProvider",
          "iam:RemoveClientIDFromOpenIDConnectProvider",
          "iam:TagOpenIDConnectProvider",
          "iam:UntagOpenIDConnectProvider",
          "iam:GetRole",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:UpdateRole",
          "iam:UpdateAssumeRolePolicy",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
          "iam:ListPolicyVersions",
          "iam:TagPolicy",
          "iam:UntagPolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:ListAttachedRolePolicies",
          "iam:ListRolePolicies",
          "iam:GetRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:ListInstanceProfilesForRole"
        ]
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/GitHubActionsECOMDeployRole",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/GitHubActionsECOMPolicy"
        ]
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

data "aws_caller_identity" "current" {}
