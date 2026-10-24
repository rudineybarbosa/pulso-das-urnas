import {
  snapshotObjectName,
  type SnapshotInput,
  type SnapshotKey,
  type SnapshotPointer,
  type SnapshotRepository,
  type StoredSnapshot,
} from "./types"

function newer(candidate: SnapshotInput, current: SnapshotPointer | undefined): boolean {
  if (!current) return true
  const candidateTime = Date.parse(candidate.generatedAt)
  const currentTime = Date.parse(current.generatedAt)
  return (
    candidateTime > currentTime || (candidateTime === currentTime && candidate.idg > current.idg)
  )
}

export class InMemorySnapshotRepository implements SnapshotRepository {
  private readonly objects = new Map<string, StoredSnapshot>()
  private readonly pointers = new Map<string, SnapshotPointer>()

  async putIfNewer(input: SnapshotInput): Promise<SnapshotPointer> {
    const objectName = snapshotObjectName(input)
    const pointer: SnapshotPointer = {
      ciclo: input.ciclo,
      pleito: input.pleito,
      escopo: input.escopo,
      cargo: input.cargo,
      idg: input.idg,
      objectName,
      generatedAt: input.generatedAt,
      collectedAt: input.collectedAt,
      parserVersion: input.parserVersion,
    }
    if (!this.objects.has(objectName)) {
      this.objects.set(objectName, { pointer, body: input.body })
    }
    const key = `${input.pleito}__${input.escopo}__${input.cargo}`
    const current = this.pointers.get(key)
    if (newer(input, current)) this.pointers.set(key, pointer)
    return this.pointers.get(key) ?? pointer
  }

  async getCurrent(key: SnapshotKey): Promise<StoredSnapshot | null> {
    const pointer = this.pointers.get(`${key.pleito}__${key.escopo}__${key.cargo}`)
    return pointer ? (this.objects.get(pointer.objectName) ?? null) : null
  }
}
