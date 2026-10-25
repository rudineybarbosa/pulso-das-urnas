variable "project_id" { type = string }
variable "region" { type = string }
variable "job_name" { type = string }
variable "service_account_email" { type = string }
# 25/10/2026: o primeiro disparo ocorre às 16:56 (America/Sao_Paulo),
# a cada minuto até 23:59. Cloud Scheduler tem precisão mínima de um minuto,
# por isso a janela das 16h e a janela das 17h em diante usam dois jobs.
# O job ainda valida a data exata para não repetir a coleta em 25/10 de anos seguintes.
variable "schedule" {
  type    = string
  default = "* 17-23 25 10 *"
}

variable "first_window_schedule" {
  type    = string
  default = "56-59 16 25 10 *"
}

resource "google_cloud_scheduler_job" "ingest_first_window" {
  project   = var.project_id
  name      = "pulso-ingest-16h56"
  region    = var.region
  schedule  = var.first_window_schedule
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
