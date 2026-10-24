const DEFAULT_ACTIVATION = "2026-10-25T16:55:00-03:00"
const DEFAULT_DEACTIVATION = "2026-10-26T00:00:00-03:00"

export const INGEST_ACTIVATION_AT = process.env.INGEST_ACTIVATION_AT ?? DEFAULT_ACTIVATION
export const INGEST_DEACTIVATION_AT = process.env.INGEST_DEACTIVATION_AT ?? DEFAULT_DEACTIVATION

/**
 * A ingestão só roda entre a ativação e o fim do dia da eleição.
 * As datas vêm do ambiente para permitir ensaio local sem alterar o código.
 */
export function isIngestActive(
  now: Date,
  activationAt = INGEST_ACTIVATION_AT,
  deactivationAt = INGEST_DEACTIVATION_AT,
): boolean {
  const start = Date.parse(activationAt)
  const end = Date.parse(deactivationAt)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error("janela de ingestão inválida: use ISO 8601 com fuso")
  }
  const timestamp = now.getTime()
  return timestamp >= start && timestamp < end
}
