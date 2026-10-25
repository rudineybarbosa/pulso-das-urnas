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
  etag?: string | null
}

export interface SnapshotPointer extends SnapshotKey {
  idg: string
  objectName: string
  generatedAt: string
  collectedAt: string
  parserVersion: string
  etag?: string | null
}

export interface StoredSnapshot {
  pointer: SnapshotPointer
  body: unknown
}

export interface SnapshotRepository {
  putIfNewer(input: SnapshotInput): Promise<SnapshotPointer>
  getCurrent(key: SnapshotKey): Promise<StoredSnapshot | null>
  /**
   * Evita que várias instâncias consultem o TSE pelo mesmo estado ao mesmo tempo.
   * Repositórios em memória (testes) podem omitir: sem lease, a consulta é permitida.
   */
  acquireLease?(key: string, ttlMs: number): Promise<boolean>
  /** Ponteiro sem baixar o corpo, usado pelo aquecedor para reaproveitar o ETag. */
  getPointer?(key: SnapshotKey): Promise<SnapshotPointer | null>
  /** Cursor do aquecedor municipal, para continuar de onde a execução anterior parou. */
  getCursor?(key: string): Promise<number | null>
  setCursor?(key: string, value: number): Promise<void>
}

export function snapshotObjectName(input: SnapshotKey & { idg: string }): string {
  return `snapshots/${input.ciclo}/${input.pleito}/${input.escopo}/${input.cargo}/${input.idg}.json`
}

export function pointerDocumentName(key: SnapshotKey): string {
  return `${key.pleito}__${key.escopo}__${key.cargo}`
}
