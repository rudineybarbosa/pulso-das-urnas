variable "project_id" { type = string }
variable "region" { type = string }
variable "job_name" { type = string }
variable "service_account_email" { type = string }

resource "google_cloud_scheduler_job" "ingest" {
  project   = var.project_id
  name      = "pulso-ingest-1m"
  region    = var.region
  schedule  = "* * * * *"
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
