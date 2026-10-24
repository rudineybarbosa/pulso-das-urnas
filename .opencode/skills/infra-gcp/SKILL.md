---
name: Infra GCP e Terraform
description: Criar, revisar ou aplicar infraestrutura do Pulso das Urnas na Google Cloud com Terraform — Cloud Run (API e job de ingestão), Firestore, Cloud Storage, Scheduler, Artifact Registry, Firebase Hosting, IAM, orçamento, alertas, deploy e rollback. Use em qualquer tarefa de infraestrutura, deploy, custo ou operação.
---

# Infra GCP e Terraform

Leia `docs/requisitos/09-infra-e-terraform.md` e o ADR-005. Custo é requisito (RNF-COST), não consequência.

## Limites

- Proibido recurso com custo fixo mensal (LB, NAT, Cloud SQL, Memorystore) sem ADR novo.
- Nenhum segredo no repositório; autenticação por WIF.
- `apply` só com pedido explícito do mantenedor; o padrão é `plan`.
- Um ambiente por projeto: `pulso-dev`, `pulso-das-urnas`; estado no GCS por ambiente.

## Fluxo

```bash
cd infra/terraform/envs/dev
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -out=tfplan
# revisar o plano; só então:
terraform apply tfplan
```

- Comandos de atalho: `make infra-plan ENV=dev`, `make infra-apply ENV=dev`.
- Terraform ausente: `scripts/install-tools.sh` (sem sudo).

## Recursos esperados

- Cloud Run service `pulso-api`: 512 MiB, concorrência 80, max 6 em prod.
- Cloud Run Job `pulso-ingest`: timeout 55 s, 5 ciclos internos de 10 s.
- Scheduler de 1 min chamando o job com OAuth.
- Firestore Native, `southamerica-east1`.
- Buckets: snapshots (versionado, lifecycle 90 d), assets, tfstate.
- Firebase Hosting com rewrite `/api/**` → Cloud Run.
- Budget US$ 10 com alertas 50/80/100%; uptime check; alerta de 5xx e de lag.

## Checklist de revisão de mudança de infra

- [ ] `terraform plan` mostra só o esperado; sem destroy acidental.
- [ ] IAM no menor privilégio (sem `roles/editor`).
- [ ] Custo estimado escrito no PR.
- [ ] Rollback descrito (revisão anterior do Cloud Run / `firebase hosting:rollback`).
- [ ] Nenhum `0.0.0.0/0` em firewall; nenhum bucket público além do necessário.
- [ ] Observabilidade: a mudança mantém `/healthz`, lag e 5xx visíveis.
- [ ] Runbook atualizado quando o procedimento muda.

## Dia da eleição

- 16h30: `min-instances=1` na API; rodar o job manualmente.
- Monitorar lag, 5xx, hit ratio e custo.
- Incidente: seguir `09-infra-e-terraform.md` §7.3; registrar horário, causa e ação.
