terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "project_id" { type = string }
variable "region" {
  type    = string
  default = "southamerica-east1"
}
variable "bucket_name" { type = string }

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_storage_bucket" "tfstate" {
  project                     = var.project_id
  name                        = var.bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning { enabled = true }

  lifecycle_rule {
    condition { num_newer_versions = 30 }
    action { type = "Delete" }
  }
}
