---
name: Segurança web
description: Checklist e padrões de segurança do Pulso das Urnas — OWASP, CSP e headers, validação, rate limit, supply chain, segredos, LGPD, buckets e custo como vetor. Use antes de publicar, ao adicionar dependência, rota, bucket ou workflow.
---

# Segurança web

O sistema é público, somente leitura e sem login. A superfície é pequena; os alvos são integridade do dado, disponibilidade na janela eleitoral e custo.

## Cabeçalhos obrigatórios

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

- Sem `unsafe-inline`: estilos vivem em arquivos CSS; dinamismo de mapa/corrida usa CSSOM (`element.style`) e variáveis CSS, nunca `style="..."` no HTML.
- Sem script de terceiro, pixel, analytics externo ou fonte remota.

## Entrada e saída

- Zod em toda entrada; parâmetro desconhecido → 400.
- Nada de `eval`, `new Function`, `child_process` com entrada.
- Sem `dangerouslySetInnerHTML` com dado externo.
- Escapar todo texto vindo do TSE.
- URLs de fonte vêm de allow-list (`resultados.tse.jus.br`), nunca do usuário.

## Abuso e custo

- Rate limit no origin: 300 req/min/IP, burst 600; 429 com `Retry-After`. A CDN absorve a leitura e NAT compartilhado não é penalizado no caminho cacheado.
- Limite de instâncias do Cloud Run e orçamento com alerta.
- CDN absorve leitura; origin não é amplificado.
- Sem endpoint de escrita.

## Segredos e supply chain

- Nenhum segredo no repositório, fixture, build ou log.
- WIF no CI; sem chave JSON.
- Lockfile obrigatório; Dependabot; `pnpm audit`.
- Dependência nova: licença, manutenção, tamanho, alternativa nativa.
- SBOM no build; imagem distroless non-root.

## LGPD e privacidade

- Nenhum dado pessoal; sem login.
- Sem cookie de rastreio; `localStorage` só preferência.
- IP não persistido.
- Página de privacidade clara.

## Verificação

```bash
pnpm audit --audit-level high
gitleaks detect --no-git -v
curl -sI https://HOST | grep -Ei 'content-security|strict-transport|referrer|x-content|permissions'
curl -s "https://HOST/api/v1/panorama?x=<script>" | head
```

## Anti-padrões

- “É público, não precisa de limite.”
- Validar só no cliente.
- Bucket com listagem pública.
- Logar payload inteiro ou IP completo.
- Ignorar dependência indireta vulnerável.
- Desligar TLS/verificação para testar.
