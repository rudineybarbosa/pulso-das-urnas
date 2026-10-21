#!/usr/bin/env node
// Mantém .opencode/skills (canônico) e .github/skills (Copilot) em sincronia.
// Uso: node scripts/check-skills.mjs [--sync]
import { createHash } from "node:crypto"
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const root = process.cwd()
const canonical = join(root, ".opencode", "skills")
const mirror = join(root, ".github", "skills")
const sync = process.argv.includes("--sync")

function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else if (entry.isFile()) out.push(path)
  }
  return out.sort()
}

function digest(files, base) {
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(relative(base, file))
    hash.update(readFileSync(file))
  }
  return hash.digest("hex")
}

const canonicalFiles = walk(canonical)
const mirrorFiles = walk(mirror)
const a = digest(canonicalFiles, canonical)
const b = digest(mirrorFiles, mirror)

if (a === b) {
  console.log(`skills em sincronia (${canonicalFiles.length} arquivos)`)
  process.exit(0)
}

if (sync) {
  rmSync(mirror, { recursive: true, force: true })
  cpSync(canonical, mirror, { recursive: true })
  console.log("skills sincronizadas de .opencode/skills para .github/skills")
  process.exit(0)
}

console.error("skills divergentes entre .opencode/skills e .github/skills")
console.error("rode: node scripts/check-skills.mjs --sync")
process.exit(1)
