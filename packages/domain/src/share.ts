export function computeShare(votes: number, validVotes: number): number {
  if (validVotes <= 0) return 0
  return Math.round((votes / validVotes) * 1000) / 10
}

export function sumShares(shares: number[]): number {
  return Math.round(shares.reduce((total, share) => total + share, 0) * 10) / 10
}

export function formatVotes(votes: number): string {
  return new Intl.NumberFormat("pt-BR").format(votes)
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`
}
