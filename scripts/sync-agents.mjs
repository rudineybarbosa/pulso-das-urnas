#!/usr/bin/env node
// Gera as definições de agentes para OpenCode e GitHub Copilot a partir de .specify/agents.
// Fonte única: .specify/agents/<nome>.md (frontmatter name, description, tools, skills).
// Uso: node scripts/sync-agents.mjs [--check]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"

const root = process.cwd()
const source = join(root, ".specify", "agents")
const targets = {
  opencode: join(root, ".opencode", "agents"),
  copilot: join(root, ".github", "agents"),
}
const check = process.argv.includes("--check")

function parse(file) {
  const raw = readFileSync(file, "utf8")
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) throw new Error(`frontmatter ausente em ${file}`)
  const meta = {}
  for (const line of match[1].split("\n")) {
    const m = /^([a-zA-Z-]+):\s*(.*)$/.exec(line.trim())
    if (!m) continue
    meta[m[1]] = m[2].replace(/^["']|["']$/g, "").trim()
  }
  return { meta, body: match[2].trim() }
}

const list = (value) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

const toolSet = (meta) => new Set(list(meta.tools).map((t) => t.toLowerCase()))

function opencodeAgent(name, meta, body) {
  const tools = toolSet(meta)
  const canEdit = tools.has("edit") || tools.has("write")
  const canShell = tools.has("bash")
  const canSpawn = tools.has("agent")
  const skills = list(meta.skills)
  const header = [
    "---",
    `description: ${meta.description}`,
    "mode: subagent",
    "permissions:",
    ...(canEdit
      ? ["  - action: edit", '    resource: "*"', "    effect: allow"]
      : ["  - action: edit", '    resource: "*"', "    effect: deny"]),
    ...(canShell
      ? ["  - action: shell", '    resource: "*"', "    effect: allow"]
      : ["  - action: shell", '    resource: "*"', "    effect: deny"]),
    ...(canSpawn
      ? ["  - action: subagent", '    resource: "*"', "    effect: allow"]
      : ["  - action: subagent", '    resource: "*"', "    effect: deny"]),
    "---",
    "",
    `<!-- gerado por scripts/sync-agents.mjs a partir de .specify/agents/${name}.md -->`,
    "",
    skills.length
      ? `> Antes de agir, carregue com a ferramenta \`skill\` as skills: ${skills.join(", ")}.`
      : "",
    "",
    "",
  ]
  return `${header.join("\n")}${body}\n`
}

function copilotAgent(name, meta, body) {
  const map = {
    read: "read",
    grep: "search",
    glob: "search",
    bash: "execute",
    edit: "edit",
    write: "edit",
    agent: "agent",
  }
  const mapped = [
    ...new Set(
      list(meta.tools)
        .map((t) => map[t.toLowerCase()])
        .filter(Boolean),
    ),
  ]
  const skills = list(meta.skills)
  const header = [
    "---",
    `name: ${name}`,
    `description: ${meta.description}`,
    mapped.length ? `tools: [${mapped.map((t) => `"${t}"`).join(", ")}]` : null,
    "---",
    "",
    `<!-- gerado por scripts/sync-agents.mjs a partir de .specify/agents/${name}.md -->`,
    "",
    "Leia `AGENTS.md` e `.github/copilot-instructions.md` antes de começar.",
    "",
    skills.length
      ? `Skills do projeto: ${skills.map((s) => `\`.github/skills/${s}/SKILL.md\``).join(", ")}. Leia a skill relevante antes de agir.`
      : "",
    "",
    "",
  ].filter((line) => line !== null)
  return `${header.join("\n")}${body}\n`
}

if (!existsSync(source)) {
  console.error("diretório .specify/agents não encontrado")
  process.exit(1)
}

const files = readdirSync(source)
  .filter((f) => f.endsWith(".md"))
  .sort()
const expected = new Map()

for (const file of files) {
  const name = file.replace(/\.md$/, "")
  const { meta, body } = parse(join(source, file))
  if (!meta.name || !meta.description) {
    console.error(`${file}: name e description são obrigatórios`)
    process.exit(1)
  }
  expected.set(join(targets.opencode, `${name}.md`), opencodeAgent(name, meta, body))
  expected.set(join(targets.copilot, `${name}.agent.md`), copilotAgent(name, meta, body))
}

let drift = 0
for (const [path, content] of expected) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : null
  if (check) {
    if (current !== content) {
      console.error(`desatualizado: ${relative(root, path)}`)
      drift++
    }
    continue
  }
  mkdirSync(join(path, ".."), { recursive: true })
  writeFileSync(path, content)
}

if (check) {
  if (drift) {
    console.error(`\n${drift} arquivo(s) divergentes. Rode: node scripts/sync-agents.mjs`)
    process.exit(1)
  }
  console.log(`agentes em sincronia (${files.length} fontes, ${expected.size} gerados)`)
} else {
  console.log(`gerados ${expected.size} arquivos para ${files.length} agentes`)
}
