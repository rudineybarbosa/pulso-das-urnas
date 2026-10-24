import { Firestore } from "@google-cloud/firestore"
import { Storage } from "@google-cloud/storage"
import {
  pointerDocumentName,
  snapshotObjectName,
  type SnapshotInput,
  type SnapshotKey,
  type SnapshotPointer,
  type SnapshotRepository,
  type StoredSnapshot,
} from "./types"

export interface GoogleSnapshotRepositoryOptions {
  projectId?: string
  bucketName: string
  storage?: Storage
  firestore?: Firestore
}

function isNewer(input: SnapshotInput, current: SnapshotPointer | undefined): boolean {
  if (!current) return true
  const left = Date.parse(input.generatedAt)
  const right = Date.parse(current.generatedAt)
  return left > right || (left === right && input.idg > current.idg)
}

export class GoogleSnapshotRepository implements SnapshotRepository {
  private readonly storage: Storage
  private readonly firestore: Firestore
  private readonly bucketName: string

  constructor(options: GoogleSnapshotRepositoryOptions) {
    this.storage = options.storage ?? new Storage({ projectId: options.projectId })
    this.firestore = options.firestore ?? new Firestore({ projectId: options.projectId })
    this.bucketName = options.bucketName
  }

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
      etag: input.etag ?? null,
    }
    const file = this.storage.bucket(this.bucketName).file(objectName)
    try {
      await file.save(JSON.stringify(input.body), {
        resumable: false,
        contentType: "application/json; charset=utf-8",
        preconditionOpts: { ifGenerationMatch: 0 },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes("conditionNotMet") && !message.includes("Precondition")) throw error
    }

    const ref = this.firestore.collection("current").doc(pointerDocumentName(input))
    return this.firestore.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(ref)
      const current = currentSnapshot.exists
        ? (currentSnapshot.data() as SnapshotPointer)
        : undefined
      if (!isNewer(input, current)) return current as SnapshotPointer
      transaction.set(ref, pointer)
      return pointer
    })
  }

  async getCurrent(key: SnapshotKey): Promise<StoredSnapshot | null> {
    const ref = this.firestore.collection("current").doc(pointerDocumentName(key))
    const snapshot = await ref.get()
    if (!snapshot.exists) return null
    const pointer = snapshot.data() as SnapshotPointer
    const [body] = await this.storage.bucket(this.bucketName).file(pointer.objectName).download()
    return { pointer, body: JSON.parse(body.toString("utf8")) as unknown }
  }
}
