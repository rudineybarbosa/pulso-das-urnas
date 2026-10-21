variable "project_id" { type = string }
variable "region" { type = string }
variable "repository" { type = string }

resource "google_artifact_registry_repository" "pulso" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repository
  format        = "DOCKER"
  description   = "Imagens da API e do job de ingestão"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions { keep_count = 10 }
  }
}
