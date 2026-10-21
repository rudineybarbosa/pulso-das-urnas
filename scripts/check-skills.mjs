#!/usr/bin/env node
// Mantém .github/skills (Copilot) espelhado a partir de duas fontes:
//   - .opencode/skills  (skills do projeto, canônicas)
//   - .agents/skills    (skills de terceiros instaladas pelo `npx skills`)
// Skills do Spec Kit (speckit-*) vivem só em .github/skills e são preservadas.
// Uso: node scripts/check-skills.mjs [--sync]
import { createHash } from "node:crypto"
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { join, relative } from "node:path"

const root = process.cwd()
const mirror = join(root, ".github", "skills")
const sync = process.argv.includes("--sync")
const isSpeckit = (name) => name.startsWith("speckit-")

const sources = [
  { id: "projeto", dir: join(root, ".opencode", "skills") },
  { id: "terceiros", dir: join(root, ".agents", "skills") },
]

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.isFile()) out.push(path)
  }
  return out.sort()
}

function skillDirs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !isSpeckit(entry.name))
    .map((entry) => entry.name)
    .sort()
}

function digest(files, base) {
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(relative(base, file))
    hash.update(readFileSync(file))
  }
  return hash.digest("hex")
}

const registered = new Map()
const problems = []

for (const source of sources) {
  const dirs = skillDirs(source.dir)
  for (const name of dirs) {
    if (registered.has(name)) {
      problems.push(`ID duplicado "${name}" em ${source.id} e ${registered.get(name)}`)
    } else {
      registered.set(name, source.id)
    }
  }
}

if (problems.length) {
  for (const problem of problems) console.error(problem)
  process.exit(1)
}

for (const source of sources) {
  const dirs = skillDirs(source.dir)
  const sourceFiles = dirs.flatMap((name) => walk(join(source.dir, name))).sort()
  const mirrorFiles = walk(mirror).filter((file) =>
    dirs.includes(relative(mirror, file).split("/")[0]),
  )
  if (digest(sourceFiles, source.dir) !== digest(mirrorFiles, join(mirror))) {
    if (!sync) {
      console.error(`skills de ${source.id} divergentes entre ${source.dir} e ${mirror}`)
      console.error("rode: node scripts/check-skills.mjs --sync")
      process.exit(1)
    }
    for (const name of dirs) {
      const target = join(mirror, name)
      rmSync(target, { recursive: true, force: true })
      cpSync(join(source.dir, name), target, { recursive: true })
    }
    console.log(`skills de ${source.id} sincronizadas (${dirs.length})`)
  } else {
    console.log(`skills de ${source.id} em sincronia (${dirs.length})`)
  }
}
