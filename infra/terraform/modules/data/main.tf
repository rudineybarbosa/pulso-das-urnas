variable "project_id" { type = string }
variable "env" { type = string }
variable "region" { type = string }

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

resource "google_storage_bucket" "snapshots" {
  project                     = var.project_id
  name                        = "pulso-snapshots-${var.env}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "assets" {
  project                     = var.project_id
  name                        = "pulso-assets-${var.env}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
}

output "snapshots_bucket" { value = google_storage_bucket.snapshots.name }
output "assets_bucket" { value = google_storage_bucket.assets.name }
output "firestore_name" { value = google_firestore_database.default.name }
