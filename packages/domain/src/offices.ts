import type { Office } from "@pulso/contracts"

/** RN-005: menor peso = maior cargo. */
export const OFFICE_WEIGHTS: Record<string, number> = {
  "1": 10, // Presidente
  "3": 20, // Governador
  "5": 30, // Senador
  "6": 40, // Deputado Federal
  "7": 50, // Deputado Estadual
  "8": 51, // Deputado Distrital
  "11": 60, // Prefeito
  "13": 70, // Vereador
  "25": 80, // Conselheiro Distrital
}

export function officeWeight(office: Pick<Office, "id" | "nome">): number {
  return OFFICE_WEIGHTS[office.id] ?? 90
}

export function compareOffices(a: Office, b: Office): number {
  const byWeight = officeWeight(a) - officeWeight(b)
  if (byWeight !== 0) return byWeight
  return a.nome.localeCompare(b.nome, "pt-BR")
}

export function featuredOffice(offices: Office[]): Office | null {
  if (offices.length === 0) return null
  return [...offices].sort(compareOffices)[0] ?? null
}

export function markFeatured(offices: Office[]): Office[] {
  const featured = featuredOffice(offices)
  return offices.map((office) => ({
    ...office,
    destaque: featured?.id === office.id,
  }))
}
