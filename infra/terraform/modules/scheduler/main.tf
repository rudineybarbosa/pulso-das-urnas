variable "project_id" { type = string }
variable "region" { type = string }
variable "job_name" { type = string }
variable "service_account_email" { type = string }
# 25/10/2026: a partir das 16:55 (America/Sao_Paulo), a cada minuto, até 23:59.
# O job ainda valida a data exata para não repetir a coleta em 25/10 de anos seguintes.
variable "schedule" {
  type    = string
  default = "* 16-23 25 10 *"
}

resource "google_cloud_scheduler_job" "ingest" {
  project   = var.project_id
  name      = "pulso-ingest-1m"
  region    = var.region
  schedule  = var.schedule
  time_zone = "America/Sao_Paulo"

  http_target {
    http_method = "POST"
    uri         = "https://run.googleapis.com/v2/projects/${var.project_id}/locations/${var.region}/jobs/${var.job_name}:run"
    oauth_token { service_account_email = var.service_account_email }
  }

  retry_config {
    retry_count = 1
  }
}

resource "google_project_iam_member" "scheduler_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${var.service_account_email}"
}
