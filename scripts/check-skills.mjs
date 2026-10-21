#!/usr/bin/env node
// Mantém .opencode/skills (canônico) espelhado em .github/skills (Copilot).
// Skills do Spec Kit (speckit-*) vivem só em .github/skills e são preservadas.
// Uso: node scripts/check-skills.mjs [--sync]
import { createHash } from "node:crypto"
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { join, relative } from "node:path"

const root = process.cwd()
const canonical = join(root, ".opencode", "skills")
const mirror = join(root, ".github", "skills")
const sync = process.argv.includes("--sync")
const isSpeckit = (name) => name.startsWith("speckit-")

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.isFile()) out.push(path)
  }
  return out.sort()
}

function projectFiles(dir) {
  return walk(dir).filter((file) => !isSpeckit(relative(dir, file).split("/")[0]))
}

function digest(files, base) {
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(relative(base, file))
    hash.update(readFileSync(file))
  }
  return hash.digest("hex")
}

const a = digest(projectFiles(canonical), canonical)
const b = digest(projectFiles(mirror), mirror)

if (a === b) {
  console.log(`skills de projeto em sincronia (${projectFiles(canonical).length} arquivos)`)
  process.exit(0)
}

if (sync) {
  for (const entry of readdirSync(canonical, { withFileTypes: true })) {
    if (!entry.isDirectory() || isSpeckit(entry.name)) continue
    const target = join(mirror, entry.name)
    rmSync(target, { recursive: true, force: true })
    cpSync(join(canonical, entry.name), target, { recursive: true })
  }
  console.log("skills de projeto sincronizadas para .github/skills")
  process.exit(0)
}

console.error("skills de projeto divergentes entre .opencode/skills e .github/skills")
console.error("rode: node scripts/check-skills.mjs --sync")
process.exit(1)
