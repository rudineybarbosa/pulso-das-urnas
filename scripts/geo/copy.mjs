#!/usr/bin/env node
// Copia as malhas versionadas de data/geo para o diretório público do web.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd().endsWith("apps/web") ? join(process.cwd(), "..", "..") : process.cwd()
const source = join(root, "data", "geo")
const target = join(root, "apps", "web", "public", "geo")

if (!existsSync(source)) {
  console.error("data/geo ausente; rode pnpm geo:build")
  process.exit(1)
}

mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })
writeFileSync(join(target, ".gitignore"), "*\n")
console.log("geo copiada para apps/web/public/geo")
