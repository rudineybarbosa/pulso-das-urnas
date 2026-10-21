import type { PartyColor } from "@pulso/contracts"

const FALLBACK_PALETTE = [
  "#C8102E",
  "#0B4EA2",
  "#F58220",
  "#0F7B4F",
  "#6D28D9",
  "#CA8A04",
  "#0E8C7F",
  "#DB2777",
  "#1E3A8A",
  "#EA580C",
  "#15803D",
  "#475569",
]

export interface PartyColorEntry {
  hex: string
  fonte?: string
}

export type PartyColorTable = Record<string, PartyColorEntry>

function channel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string): number {
  const clean = hex.replace("#", "")
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean
  const value = Number.parseInt(expanded, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const light = Math.max(luminance(a), luminance(b))
  const dark = Math.min(luminance(a), luminance(b))
  return (light + 0.05) / (dark + 0.05)
}

export function pickTextColor(hex: string): "#FFFFFF" | "#0B1220" {
  return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, "#0B1220") ? "#FFFFFF" : "#0B1220"
}

function hash(sigla: string): number {
  let value = 0x811c9dc5
  for (const char of sigla) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 0x01000193)
  }
  return Math.abs(value)
}

export function resolvePartyColor(sigla: string, table: PartyColorTable): PartyColor {
  const normalized = sigla.trim().toUpperCase()
  const entry = table[normalized]
  if (entry) {
    return { sigla: normalized, hex: entry.hex, texto: pickTextColor(entry.hex), origem: "tabela" }
  }
  const hex = FALLBACK_PALETTE[hash(normalized) % FALLBACK_PALETTE.length] ?? "#475569"
  return { sigla: normalized, hex, texto: pickTextColor(hex), origem: "fallback" }
}

export function ensureContrast(hex: string, minimum: number): string {
  let candidate = hex.toUpperCase()
  let step = 0
  while (
    contrastRatio(candidate, "#FFFFFF") < minimum &&
    contrastRatio(candidate, "#0B1220") < minimum
  ) {
    step += 1
    if (step > 20) return "#475569"
    candidate = adjust(candidate, step % 2 === 0 ? -12 : 12)
  }
  return candidate
}

function adjust(hex: string, amount: number): string {
  const value = Number.parseInt(hex.replace("#", ""), 16)
  const clamp = (input: number) => Math.max(0, Math.min(255, input + amount))
  const r = clamp((value >> 16) & 255)
  const g = clamp((value >> 8) & 255)
  const b = clamp(value & 255)
  return `#${[r, g, b]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`
}

export interface LeaderVotes {
  id: string
  votos: number
}

export interface HysteresisState {
  leader: LeaderVotes | null
  streak: number
}

export interface HysteresisResult extends HysteresisState {
  changed: boolean
  acirrada: boolean
}

/** RN-038: troca só com 0,5% dos válidos ou 500 votos, por 2 snapshots. */
export function nextLeader(
  previous: LeaderVotes | null,
  incoming: LeaderVotes | null,
  validVotes: number,
  streak: number,
): HysteresisResult {
  if (!incoming) {
    return { leader: null, streak: 0, changed: previous !== null, acirrada: false }
  }
  if (!previous) {
    return { leader: incoming, streak: 0, changed: true, acirrada: false }
  }
  if (previous.id === incoming.id) {
    return { leader: incoming, streak: 0, changed: false, acirrada: false }
  }
  const threshold = Math.max(validVotes * 0.005, 500)
  const difference = incoming.votos - previous.votos
  if (difference >= threshold) {
    const nextStreak = streak + 1
    if (nextStreak >= 2) {
      return { leader: incoming, streak: 0, changed: true, acirrada: false }
    }
    return { leader: previous, streak: nextStreak, changed: false, acirrada: true }
  }
  return { leader: previous, streak: 0, changed: false, acirrada: true }
}
