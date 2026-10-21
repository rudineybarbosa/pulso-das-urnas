import type { Candidate, VoteDestination } from "@pulso/contracts"

export type CandidateLike = Pick<
  Candidate,
  "id" | "nome" | "nomeUrna" | "numero" | "partido" | "votos" | "destinacao"
>

export function isEligible(candidate: Pick<CandidateLike, "destinacao">): boolean {
  return candidate.destinacao === "Válido"
}

export function countsToValidVotes(destinacao: VoteDestination): boolean {
  return destinacao === "Válido" || destinacao === "Válido (legenda)"
}

export function orderCandidates<T extends CandidateLike>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    if (b.votos !== a.votos) return b.votos - a.votos
    const byName = a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR")
    if (byName !== 0) return byName
    const byNumber = a.numero.localeCompare(b.numero, "pt-BR")
    if (byNumber !== 0) return byNumber
    return a.id.localeCompare(b.id)
  })
}

export interface LeaderResult<T> {
  candidate: T | null
  tie: T[]
  eligible: T[]
}

export function pickLeader<T extends CandidateLike>(candidates: T[]): LeaderResult<T> {
  const eligible = orderCandidates(candidates.filter((candidate) => isEligible(candidate)))
  const first = eligible[0]
  if (!first) return { candidate: null, tie: [], eligible }
  const tie = eligible.filter((candidate) => candidate.votos === first.votos)
  return { candidate: first, tie, eligible }
}

export function sumValidVotes(candidates: CandidateLike[]): number {
  return candidates
    .filter((candidate) => countsToValidVotes(candidate.destinacao))
    .reduce((total, candidate) => total + candidate.votos, 0)
}
