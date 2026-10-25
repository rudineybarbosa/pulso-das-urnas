variable "project_id" { type = string }
variable "env" { type = string }
variable "region" { type = string }
variable "image" { type = string }
variable "snapshots_bucket" { type = string }
variable "assets_bucket" { type = string }
variable "min_instances" { type = number }
variable "max_instances" { type = number }
variable "default_election_id" {
  type    = string
  default = "6258"
}
variable "ingest_activation_at" {
  type    = string
  default = "2026-10-25T16:55:00-03:00"
}
variable "ingest_deactivation_at" {
  type    = string
  default = "2026-10-26T00:00:00-03:00"
}

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

resource "google_project_iam_member" "api_datastore_viewer" {
  project = var.project_id
  role    = "roles/datastore.viewer"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_datastore_editor" {
  project = var.project_id
  role    = "roles/datastore.editor"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_storage_bucket_iam_member" "api_snapshots_writer" {
  bucket = var.snapshots_bucket
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "ingest_datastore_editor" {
  project = var.project_id
  role    = "roles/datastore.editor"
  member  = "serviceAccount:${google_service_account.ingest.email}"
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

  scaling {}

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
      env {
        name  = "DEFAULT_ELECTION_ID"
        value = var.default_election_id
      }
      resources {
        limits            = { cpu = "1", memory = "512Mi" }
        cpu_idle          = false
        startup_cpu_boost = true
      }
    }
  }

  lifecycle {
    ignore_changes = [
      scaling[0],
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
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
        image   = var.image
        command = ["pnpm"]
        args    = ["--filter", "@pulso/ingest", "dev"]
        env {
          name  = "DATA_MODE"
          value = "real"
        }
        env {
          name  = "CYCLE_SECONDS"
          value = "0"
        }
        env {
          name  = "CYCLE_COUNT"
          value = "1"
        }
        env {
          name  = "MAX_RPS_TSE"
          value = "5"
        }
        env {
          name  = "INGEST_ACTIVATION_AT"
          value = var.ingest_activation_at
        }
        env {
          name  = "INGEST_DEACTIVATION_AT"
          value = var.ingest_deactivation_at
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
          name  = "ELECTION_ID"
          value = var.default_election_id
        }
        env {
          name  = "CICLO"
          value = "ele2026"
        }
      }
    }
  }
}

resource "google_cloud_run_v2_job" "municipal" {
  project  = var.project_id
  name     = "pulso-municipios"
  location = var.region

  template {
    template {
      service_account = google_service_account.ingest.email
      timeout         = "240s"
      max_retries     = 0
      containers {
        image   = var.image
        command = ["pnpm"]
        args    = ["--filter", "@pulso/ingest", "dev"]
        env {
          name  = "DATA_MODE"
          value = "real"
        }
        env {
          name  = "MUNICIPAL_SWEEP_ONLY"
          value = "1"
        }
        env {
          name  = "MUNICIPAL_BUDGET_MS"
          value = "180000"
        }
        env {
          name  = "MUNICIPAL_LIMIT"
          value = "900"
        }
        env {
          name  = "CARGO_ID"
          value = "1"
        }
        env {
          name  = "INGEST_ACTIVATION_AT"
          value = var.ingest_activation_at
        }
        env {
          name  = "INGEST_DEACTIVATION_AT"
          value = var.ingest_deactivation_at
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
          name  = "ELECTION_ID"
          value = var.default_election_id
        }
        env {
          name  = "CICLO"
          value = "ele2026"
        }
      }
    }
  }
}

output "api_url" { value = google_cloud_run_v2_service.api.uri }
output "api_service_account" { value = google_service_account.api.email }
output "ingest_service_account" { value = google_service_account.ingest.email }
output "job_name" { value = google_cloud_run_v2_job.ingest.name }
output "municipal_job_name" { value = google_cloud_run_v2_job.municipal.name }
