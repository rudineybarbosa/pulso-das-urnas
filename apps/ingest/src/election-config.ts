export interface ElectionConfig {
  electionId: string
  cycle: string
  activationAt: string
  deactivationAt: string
}

export function electionConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ElectionConfig {
  return {
    electionId: env.ELECTION_ID ?? "6258",
    cycle: env.CICLO ?? "ele2026",
    activationAt: env.INGEST_ACTIVATION_AT ?? "2026-10-25T16:55:00-03:00",
    deactivationAt: env.INGEST_DEACTIVATION_AT ?? "2026-10-26T00:00:00-03:00",
  }
}
