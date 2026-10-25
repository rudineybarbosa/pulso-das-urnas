variable "project_id" { type = string }
variable "env" { type = string }
variable "public_host" {
  type    = string
  default = ""
}
variable "billing_account" {
  type    = string
  default = ""
}
variable "budget_amount" {
  type    = string
  default = "10"
}
variable "budget_currency_code" {
  type    = string
  default = "USD"
}
variable "early_warning_percent" {
  type    = number
  default = 0
}

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_monitoring_uptime_check_config" "api" {
  count        = var.public_host == "" ? 0 : 1
  project      = var.project_id
  display_name = "pulso-api-${var.env}"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/readyz"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      host = var.public_host
    }
  }
}

resource "google_billing_budget" "monthly" {
  count           = var.billing_account == "" ? 0 : 1
  billing_account = var.billing_account
  display_name    = "pulso-${var.env}"

  budget_filter {
    projects = ["projects/${data.google_project.project.number}"]
  }

  amount {
    specified_amount {
      currency_code = var.budget_currency_code
      units         = var.budget_amount
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  dynamic "threshold_rules" {
    for_each = var.early_warning_percent > 0 ? [var.early_warning_percent] : []
    content {
      threshold_percent = threshold_rules.value
    }
  }
  threshold_rules {
    threshold_percent = 0.8
  }
  threshold_rules {
    threshold_percent = 1.0
  }
}
