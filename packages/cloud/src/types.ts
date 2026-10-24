export interface SnapshotKey {
  ciclo: string
  pleito: string
  escopo: string
  cargo: string
}

export interface SnapshotInput extends SnapshotKey {
  idg: string
  generatedAt: string
  collectedAt: string
  parserVersion: string
  body: unknown
}

export interface SnapshotPointer extends SnapshotKey {
  idg: string
  objectName: string
  generatedAt: string
  collectedAt: string
  parserVersion: string
}

export interface StoredSnapshot {
  pointer: SnapshotPointer
  body: unknown
}

export interface SnapshotRepository {
  putIfNewer(input: SnapshotInput): Promise<SnapshotPointer>
  getCurrent(key: SnapshotKey): Promise<StoredSnapshot | null>
}

export function snapshotObjectName(input: SnapshotKey & { idg: string }): string {
  return `snapshots/${input.ciclo}/${input.pleito}/${input.escopo}/${input.cargo}/${input.idg}.json`
}

export function pointerDocumentName(key: SnapshotKey): string {
  return `${key.pleito}__${key.escopo}__${key.cargo}`
}
