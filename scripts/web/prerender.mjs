#!/usr/bin/env node
// Gera HTML estático com metadados OG para /br, 27 UFs e todos os municípios.
// Roda no postbuild; falha se a contagem ficar abaixo do catálogo.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

const root = process.cwd().endsWith("apps/web") ? join(process.cwd(), "..", "..") : process.cwd()
const dist = join(root, "apps", "web", "dist")
const templatePath = join(dist, "index.html")
const catalogPath = join(root, "data", "fixtures", "tse", "config", "mun-e006257-cm.json")
const SITE = process.env.PUBLIC_SITE_URL ?? "https://pulso-das-urnas-prod.web.app"

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function escape(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
}

function page(template, { title, description, url, scope = "Brasil" }) {
  const meta = [
    `<meta name="description" content="${escape(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${escape(url)}" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<link rel="canonical" href="${escape(url)}" />`,
  ].join("\n    ")
  const content = `<main class="seo-content"><h1>${escape(title)}</h1><p>${escape(description)}</p><p>Escopo: ${escape(scope)}. Acompanhe o 2º turno de 2026 com dados públicos do TSE, horário da geração e estado de frescor.</p><p><a href="https://resultados.tse.jus.br/">Fonte oficial: Tribunal Superior Eleitoral</a>. Este site não é um serviço oficial do TSE.</p></main>`
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
    .replace('<div id="root"></div>', `<div id="root">${content}</div>`)
    .replace("</head>", `    ${meta}\n  </head>`)
}

const template = await readFile(templatePath, "utf8")
const catalog = JSON.parse(await readFile(catalogPath, "utf8"))
const ufs = catalog.abr ?? []

await rm(join(dist, "br"), { recursive: true, force: true })

const routes = []
for (const uf of ufs) {
  const sigla = String(uf.cd ?? "").toLowerCase()
  const stateName = String(uf.ds ?? sigla).replace(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+$/, (text) =>
    text.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()),
  )
  routes.push({
    path: `br/${sigla}`,
    title: `${stateName} — Pulso das Urnas`,
    description: `Acompanhe a apuração do 2º turno de 2026 em ${stateName}, com dados públicos do TSE e horário da geração.`,
    scope: stateName,
  })
  for (const city of uf.mu ?? []) {
    if (!city.nm) continue
    routes.push({
      path: `br/${sigla}/${slugify(city.nm)}`,
      title: `${city.nm} — Pulso das Urnas`,
      description: `Acompanhe a apuração do 2º turno de 2026 em ${city.nm} (${sigla.toUpperCase()}), com fonte TSE e horário da geração.`,
      scope: `${city.nm} (${sigla.toUpperCase()})`,
    })
  }
}

for (const route of routes) {
  const target = join(dist, route.path, "index.html")
  await mkdir(join(target, ".."), { recursive: true })
  await writeFile(target, page(template, { ...route, url: `${SITE}/${route.path}` }))
}

// A rota raiz e /br compartilham o HTML do Brasil.
await mkdir(join(dist, "br"), { recursive: true })
await writeFile(
  join(dist, "br", "index.html"),
  page(template, {
    title: "Pulso das Urnas — apuração em tempo real",
    description:
      "Acompanhe a apuração do 2º turno de 2026 com mapa do Brasil, votos por município, fonte TSE e horário da geração.",
    url: `${SITE}/br`,
  }),
)

await writeFile(
  join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /telao\nSitemap: ${SITE}/sitemap.xml\n`,
)
const sitemapRoutes = ["br", ...routes.map((route) => route.path)]
await writeFile(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapRoutes
    .map((path) => `<url><loc>${SITE}/${path}</loc></url>`)
    .join("")}</urlset>\n`,
)

if (routes.length < 5570) {
  console.error(`prerender incompleto: ${routes.length} rotas`)
  process.exit(1)
}
console.log(`prerender: ${routes.length} rotas com OG`)
