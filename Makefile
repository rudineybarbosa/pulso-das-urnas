.PHONY: help install dev dev-real test test-e2e lint typecheck build skills-check skills-sync docs-check infra-plan infra-apply infra-fmt clean

ENV ?= dev
TF_DIR := infra/terraform/envs/$(ENV)

help:
	@echo "Pulso das Urnas"
	@echo ""
	@echo "  install        instala dependências (pnpm)"
	@echo "  dev            web + api em modo fake"
	@echo "  dev-real       web + api lendo o TSE"
	@echo "  test           unitários e contrato"
	@echo "  test-e2e       Playwright em modo fake"
	@echo "  lint           ESLint + Prettier"
	@echo "  typecheck      TypeScript"
	@echo "  build          build de produção + orçamento"
	@echo "  skills-check   verifica espelho de skills"
	@echo "  skills-sync    sincroniza .github/skills"
	@echo "  docs-check     links e IDs"
	@echo "  infra-plan     terraform plan (ENV=dev|prod)"
	@echo "  infra-apply    terraform apply (manual)"
	@echo "  clean          remove artefatos"

install:
	pnpm install

dev:
	pnpm dev

dev-real:
	DATA_MODE=real pnpm dev

test:
	pnpm test

test-e2e:
	pnpm test:e2e

lint:
	pnpm lint

typecheck:
	pnpm typecheck

build:
	pnpm build

skills-check:
	node scripts/check-skills.mjs

skills-sync:
	node scripts/check-skills.mjs --sync

docs-check:
	node scripts/check-links.mjs

infra-plan:
	cd $(TF_DIR) && terraform init && terraform plan -out=tfplan

infra-apply:
	cd $(TF_DIR) && terraform init && terraform apply tfplan

infra-fmt:
	terraform fmt -recursive infra/terraform

clean:
	rm -rf node_modules apps/*/node_modules packages/*/node_modules dist build coverage playwright-report test-results
