variable "project_id" { type = string }
variable "env" { type = string }
variable "region" { type = string }
variable "image" { type = string }
variable "snapshots_bucket" { type = string }
variable "assets_bucket" { type = string }
variable "min_instances" { type = number }
variable "max_instances" { type = number }

resource "google_service_account" "api" {
  project      = var.project_id
  account_id   = "sa-api-${var.env}"
  display_name = "Pulso API (${var.env})"
}

resource "google_service_account" "ingest" {
  project      = var.project_id
  account_id   = "sa-ingest-${var.env}"
  display_name = "Pulso ingest (${var.env})"
}

resource "google_storage_bucket_iam_member" "api_assets" {
  bucket = var.assets_bucket
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.api.email}"
}

resource "google_storage_bucket_iam_member" "api_snapshots" {
  bucket = var.snapshots_bucket
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.api.email}"
}

resource "google_storage_bucket_iam_member" "ingest_snapshots" {
  bucket = var.snapshots_bucket
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.ingest.email}"
}

resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = "pulso-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api.email
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
    containers {
      image = var.image
      ports { container_port = 8787 }
      env {
        name  = "DATA_MODE"
        value = "real"
      }
      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }
      env {
        name  = "SNAPSHOT_BUCKET"
        value = var.snapshots_bucket
      }
      env {
        name  = "ASSETS_BUCKET"
        value = var.assets_bucket
      }
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
    }
  }
}

resource "google_cloud_run_v2_job" "ingest" {
  project  = var.project_id
  name     = "pulso-ingest"
  location = var.region

  template {
    template {
      service_account = google_service_account.ingest.email
      timeout         = "55s"
      max_retries     = 1
      containers {
        image = var.image
        env {
          name  = "DATA_MODE"
          value = "real"
        }
        env {
          name  = "CYCLE_SECONDS"
          value = "10"
        }
        env {
          name  = "CYCLE_COUNT"
          value = "5"
        }
        env {
          name  = "MAX_RPS_TSE"
          value = "5"
        }
        env {
          name  = "GCP_PROJECT"
          value = var.project_id
        }
        env {
          name  = "SNAPSHOT_BUCKET"
          value = var.snapshots_bucket
        }
      }
    }
  }
}

output "api_url" { value = google_cloud_run_v2_service.api.uri }
output "api_service_account" { value = google_service_account.api.email }
output "ingest_service_account" { value = google_service_account.ingest.email }
output "job_name" { value = google_cloud_run_v2_job.ingest.name }
