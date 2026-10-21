import type { AbsenceStatus } from "@pulso/contracts"

export interface AbsenceInput {
  hasFile: boolean
  applies: boolean
  validVotes: number
  hasEligibleLeader: boolean
}

/** RN-035: precedência determinística dos estados de ausência. */
export function resolveStatus(input: AbsenceInput): AbsenceStatus {
  if (!input.hasFile) return input.applies ? "sem_dado" : "nao_aplicavel"
  if (input.validVotes <= 0) return "sem_voto"
  if (!input.hasEligibleLeader) return "sem_lider_elegivel"
  return "ok"
}

export function isAbsent(status: AbsenceStatus): boolean {
  return status !== "ok"
}
