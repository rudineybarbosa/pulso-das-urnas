export interface RaceInput {
  progress: number
  votesA: number
  votesB: number
  validVotes: number
}

export interface RacePosition {
  g: number
  xA: number
  xB: number
  base: number
  separation: number
}

export const RACE = {
  margin: 0.08,
  horseWidth: 0.12,
  maxSeparation: 0.14,
} as const

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

/** RN-015: d com sinal; avanço pela apuração, separação pela diferença. */
export function racePositions(input: RaceInput): RacePosition {
  const progress = clamp(input.progress / 100)
  const valid = Math.max(0, input.validVotes)
  const difference = input.votesA - input.votesB
  const g =
    valid > 0 ? Math.sign(difference) * (Math.log1p(Math.abs(difference)) / Math.log1p(valid)) : 0
  const usable = 1 - 2 * RACE.margin - RACE.horseWidth
  const base = RACE.margin + progress * usable
  const separation = RACE.maxSeparation * usable * Math.abs(g)
  const sign = Math.sign(difference)
  return {
    g,
    base,
    separation,
    xA: base + (separation / 2) * sign,
    xB: base - (separation / 2) * sign,
  }
}

export interface OvertakeTracker {
  previousG: number
  streak: number
  lastAt: number
}

export interface OvertakeResult extends OvertakeTracker {
  overtake: boolean
}

/** RN-016: sinal invertido + |g| ≥ 0,01 por 2 snapshots + cooldown 30 s. */
export function detectOvertake(
  tracker: OvertakeTracker,
  g: number,
  now: number,
  cooldownMs = 30_000,
): OvertakeResult {
  const previousSign = Math.sign(tracker.previousG)
  const sign = Math.sign(g)
  const changedSign = sign !== 0 && previousSign !== 0 && sign !== previousSign
  const continues = tracker.streak > 0 && sign !== 0 && sign === previousSign
  const strong = Math.abs(g) >= 0.01
  const streak = (changedSign || continues) && strong ? tracker.streak + 1 : 0
  const cooldownReady = tracker.lastAt === 0 || now - tracker.lastAt >= cooldownMs
  if (streak >= 2 && cooldownReady) {
    return { previousG: g, streak: 0, lastAt: now, overtake: true }
  }
  return { previousG: g, streak, lastAt: tracker.lastAt, overtake: false }
}
