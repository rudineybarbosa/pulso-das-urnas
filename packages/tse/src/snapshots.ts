import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

export interface SnapshotRecord {
  cycle: string
  electionId: string
  scopeId: string
  officeId: string
  generationId: string
  capturedAt: string
  payload: unknown
}

export function snapshotKey(
  record: Pick<SnapshotRecord, "cycle" | "electionId" | "scopeId" | "officeId" | "generationId">,
): string {
  return `${record.cycle}/${record.electionId}/${record.scopeId}/${record.officeId}/${record.generationId}.json`
}

/** RN-027: a mesma geração não é regravada. */
export async function saveSnapshot(
  root: string,
  record: SnapshotRecord,
): Promise<{ written: boolean; path: string }> {
  const path = join(root, snapshotKey(record))
  try {
    await readFile(path)
    return { written: false, path }
  } catch {
    /* ainda não existe */
  }
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(record))
  return { written: true, path }
}

export async function readSnapshot(root: string, key: string): Promise<SnapshotRecord | null> {
  try {
    const raw = await readFile(join(root, key), "utf8")
    return JSON.parse(raw) as SnapshotRecord
  } catch {
    return null
  }
}

export async function listSnapshots(root: string): Promise<string[]> {
  const output: string[] = []
  async function walk(dir: string, prefix = ""): Promise<void> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) await walk(join(dir, entry.name), relative)
      else if (entry.name.endsWith(".json")) output.push(relative)
    }
  }
  await walk(root)
  return output.sort()
}
