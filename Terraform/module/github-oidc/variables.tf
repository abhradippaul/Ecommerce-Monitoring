variable "github_repositories" {
  description = "List of GitHub repositories to grant access to"
  type = list(object({
    org    = string
    repo   = string
    branch = optional(string, "*")
  }))
  default = [
    {
      org    = "<org-name>"
      repo   = "<repo-name>"
      branch = "*"
    }
  ]
}
