terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
  backend "gcs" {
    bucket = "pulso-tfstate"
    prefix = "terraform/state"
  }
}

variable "project_id" {
  type    = string
  default = "pulso-das-urnas"
}
variable "region" {
  type    = string
  default = "southamerica-east1"
}
variable "image" {
  type    = string
  default = "southamerica-east1-docker.pkg.dev/pulso-das-urnas/pulso/api:latest"
}
variable "billing_account" {
  type    = string
  default = ""
}
variable "public_host" {
  type    = string
  default = ""
}
variable "default_election_id" {
  type    = string
  default = "6258"
}

provider "google" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
}

locals {
  env = "prod"
  services = [
    "run.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudscheduler.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "billingbudgets.googleapis.com",
    "firebase.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]
}

module "apis" {
  source     = "../../modules/apis"
  project_id = var.project_id
  services   = local.services
}

module "artifact" {
  source     = "../../modules/artifact"
  project_id = var.project_id
  region     = var.region
  repository = "pulso"
  depends_on = [module.apis]
}

module "data" {
  source     = "../../modules/data"
  project_id = var.project_id
  env        = local.env
  region     = var.region
  depends_on = [module.apis]
}

module "runtime" {
  source           = "../../modules/runtime"
  project_id       = var.project_id
  env              = local.env
  region           = var.region
  image            = var.image
  snapshots_bucket = module.data.snapshots_bucket
  assets_bucket    = module.data.assets_bucket
  # Fora da janela eleitoral a API escala a zero; o site continua no ar.
  # Na eleição: min_instances = 1 e always_allocated_cpu = true.
  min_instances        = 0
  always_allocated_cpu = false
  max_instances        = 6
  default_election_id  = var.default_election_id
  depends_on           = [module.apis, module.data]
}

module "scheduler" {
  source                = "../../modules/scheduler"
  project_id            = var.project_id
  region                = var.region
  job_name              = module.runtime.job_name
  municipal_job_name    = module.runtime.municipal_job_name
  service_account_email = module.runtime.ingest_service_account
  depends_on            = [module.runtime]
}

module "hosting" {
  source     = "../../modules/hosting"
  project_id = var.project_id
  site_id    = "pulso-das-urnas"
  depends_on = [module.apis]
}

module "observability" {
  source          = "../../modules/observability"
  project_id      = var.project_id
  env             = local.env
  public_host     = var.public_host
  billing_account = var.billing_account
  # Billing account currency is BRL; R$50 is the rounded operational equivalent of US$10.
  budget_amount         = "50"
  budget_currency_code  = "BRL"
  early_warning_percent = 0.2
}

output "api_url" { value = module.runtime.api_url }
output "site_id" { value = "pulso-das-urnas" }
