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
      const code = (error as { code?: number }).code
      const alreadyExists =
        code === 412 ||
        /conditionNotMet|pre-?condition/i.test(message) ||
        /at least one of the pre-conditions/i.test(message)
      if (!alreadyExists) throw error
    }

    const ref = this.firestore.collection("current").doc(pointerDocumentName(input))
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.firestore.runTransaction(async (transaction) => {
          const currentSnapshot = await transaction.get(ref)
          const current = currentSnapshot.exists
            ? (currentSnapshot.data() as SnapshotPointer)
            : undefined
          if (!isNewer(input, current)) return current as SnapshotPointer
          transaction.set(ref, pointer)
          return pointer
        })
      } catch (error) {
        if (attempt >= 2) throw error
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt))
      }
    }
  }

  async getCurrent(key: SnapshotKey): Promise<StoredSnapshot | null> {
    const ref = this.firestore.collection("current").doc(pointerDocumentName(key))
    const snapshot = await ref.get()
    if (!snapshot.exists) return null
    const pointer = snapshot.data() as SnapshotPointer
    const [body] = await this.storage.bucket(this.bucketName).file(pointer.objectName).download()
    return { pointer, body: JSON.parse(body.toString("utf8")) as unknown }
  }

  async getPointer(key: SnapshotKey): Promise<SnapshotPointer | null> {
    const snapshot = await this.firestore.collection("current").doc(pointerDocumentName(key)).get()
    return snapshot.exists ? (snapshot.data() as SnapshotPointer) : null
  }

  async getCursor(key: string): Promise<number | null> {
    const snapshot = await this.firestore.collection("cursors").doc(key).get()
    if (!snapshot.exists) return null
    const value = Number(snapshot.get("value"))
    return Number.isFinite(value) ? value : null
  }

  async setCursor(key: string, value: number): Promise<void> {
    await this.firestore
      .collection("cursors")
      .doc(key)
      .set({ value, updatedAt: new Date().toISOString() })
  }

  async acquireLease(key: string, ttlMs: number): Promise<boolean> {
    const ref = this.firestore.collection("leases").doc(key.replace(/[^\w.-]+/g, "_"))
    return this.firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(ref)
      const now = Date.now()
      const until = current.exists ? Number(current.get("until") ?? 0) : 0
      if (until > now) return false
      transaction.set(ref, {
        until: now + ttlMs,
        holder: process.env.K_SERVICE ?? "local",
        acquiredAt: new Date(now).toISOString(),
      })
      return true
    })
  }
}
