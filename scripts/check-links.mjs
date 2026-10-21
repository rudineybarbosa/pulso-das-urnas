#!/usr/bin/env node
// Verifica links internos e IDs de requisito duplicados/órfãos.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"

const root = process.cwd()
const skip = new Set(["node_modules", ".git", "dist", "build", "coverage", "playwright-report", ".terraform"])
const skipPaths = [join(".github", "skills"), join(".agents", "skills")]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      const rel = relative(root, path)
      if (skipPaths.some((p) => rel === p || rel.startsWith(p + sep))) continue
      walk(path, out)
    } else if (entry.isFile() && entry.name.endsWith(".md")) out.push(path)
  }
  return out
}

function slug(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

const files = walk(root)
const errors = []
const anchors = new Map()

for (const file of files) {
  const text = readFileSync(file, "utf8")
  const set = new Set()
  for (const line of text.split("\n")) {
    const m = /^#{1,6}\s+(.*)$/.exec(line)
    if (m) set.add(slug(m[1]))
  }
  anchors.set(resolve(file), set)
}

for (const file of files) {
  const text = readFileSync(file, "utf8")
  const dir = dirname(file)

  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1]
    if (/^(https?:|mailto:|tel:)/.test(target)) continue
    if (target.startsWith("#")) {
      const id = target.slice(1)
      if (!anchors.get(resolve(file))?.has(id)) {
        errors.push(`${relative(root, file)}: âncora inexistente ${target}`)
      }
      continue
    }
    const [pathPart, anchor] = target.split("#")
    const resolved = resolve(dir, decodeURIComponent(pathPart))
    if (!existsSync(resolved)) {
      errors.push(`${relative(root, file)}: link quebrado ${target}`)
      continue
    }
    if (anchor && statSync(resolved).isFile() && resolved.endsWith(".md")) {
      if (!anchors.get(resolved)?.has(anchor)) {
        errors.push(`${relative(root, file)}: âncora inexistente ${target}`)
      }
    }
  }
}

const definitions = new Map()
const idPattern = /\b(RF|RN|AT|RNF|ADR|Q)-?([A-Z]*-?\d{3})\b/g
for (const file of files) {
  const text = readFileSync(file, "utf8")
  for (const line of text.split("\n")) {
    const m = /^#{1,6}\s+((?:RF|RN|AT|ADR|Q)-\d{3})\b/.exec(line)
    if (m && m[1].endsWith("000")) continue
    if (m) {
      const id = m[1]
      if (definitions.has(id)) {
        errors.push(`ID duplicado ${id}: ${relative(root, definitions.get(id))} e ${relative(root, file)}`)
      } else {
        definitions.set(id, file)
      }
    }
  }
}

const referenced = new Map()
for (const file of files) {
  const text = readFileSync(file, "utf8")
  for (const m of text.matchAll(idPattern)) {
    const id = `${m[1]}-${m[2]}`
    if (!referenced.has(id)) referenced.set(id, file)
  }
}

for (const [id, file] of referenced) {
  if (!definitions.has(id) && !id.startsWith("RNF-") && !id.endsWith("000")) {
    errors.push(`${relative(root, file)}: referência a ${id} sem definição`)
  }
}

if (errors.length) {
  console.error(`${errors.length} problema(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`${files.length} arquivos, ${definitions.size} IDs: links e referências ok`)
