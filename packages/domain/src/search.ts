export interface LocalidadeLike {
  tipo: "estado" | "municipio"
  nome: string
  uf: string
  slug: string
  ibge?: number
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, 80)
}

interface Ranked<T> {
  item: T
  score: number
}

export function rankLocalidades<T extends LocalidadeLike>(
  query: string,
  items: T[],
  limit = 10,
): T[] {
  const term = normalizeText(query)
  if (term.length < 2) return []
  const ranked: Ranked<T>[] = []

  for (const item of items) {
    const name = normalizeText(item.nome)
    const uf = normalizeText(item.uf)
    let score = -1
    if (name === term || uf === term) score = 100
    else if (name.startsWith(term)) score = 70
    else if (name.includes(term)) score = 40
    if (score < 0) continue
    if (item.tipo === "estado") score += 5
    ranked.push({ item, score })
  }

  return ranked
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const byType = (a.item.tipo === "estado" ? 0 : 1) - (b.item.tipo === "estado" ? 0 : 1)
      if (byType !== 0) return byType
      return a.item.nome.localeCompare(b.item.nome, "pt-BR")
    })
    .slice(0, limit)
    .map((entry) => entry.item)
}
