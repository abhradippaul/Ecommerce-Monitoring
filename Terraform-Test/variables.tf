variable "environment" {
  description = "Environment Name (prod, staging, dev)"
  type        = string

  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "Environment name must be prod, staging or dev"
  }
}

variable "project_name" {
  description = "Project Name"
  type        = string
}
