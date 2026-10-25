import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Panorama } from "@pulso/contracts"
import { Legend } from "./Legend"

const panorama: Panorama = {
  apiVersion: "1",
  eleicao: "6257",
  versao: "v1",
  catalogVersion: "v1",
  geradoEm: "2026-10-21T12:00:00-03:00",
  fonte: {
    nome: "TSE",
    url: "local",
    generationId: "1",
    generatedAt: "2026-10-21T12:00:00-03:00",
    collectedAt: "2026-10-21T12:00:00-03:00",
    parserVersion: "1.0.0",
    status: "ao_vivo",
    sourceAgeSeconds: 0,
    collectedAgeSeconds: 0,
    snapshotAgeSeconds: 0,
  },
  pleito: { id: "3220", nome: "2026", turno: 1 },
  cargoEmDestaque: { id: "1", nome: "Presidente", tipo: "majoritario" },
  cargoSelecionado: { id: "1", nome: "Presidente", tipo: "majoritario" },
  apuracao: { secoesTotalizadas: 10, secoesTotal: 10, percentual: 100, finalizada: true },
  resumo: {
    votosValidos: 100,
    brancos: 1,
    nulos: 1,
    comparecimento: 120,
    abstencao: 20,
    eleitorado: 140,
    basePercentual: "validos",
  },
  candidatos: [],
  estados: [
    {
      uf: "SP",
      nome: "São Paulo",
      ibge: 35,
      cor: { sigla: "PL", hex: "#0B4EA2", texto: "#FFFFFF", origem: "tabela" },
      lider: { candidatoId: "a", nome: "FULANO", partido: "PL", votos: 60, percentual: 60 },
      votosValidos: 100,
      percentualApurado: 100,
      status: "ok",
      origem: null,
      disputaAcirrada: false,
    },
  ],
}

describe("Legend", () => {
  it("mostra partidos e estados especiais", () => {
    render(<Legend panorama={panorama} />)
    expect(screen.getByText("PL")).toBeInTheDocument()
    expect(screen.getByText("sem voto")).toBeInTheDocument()
    expect(screen.getByText("sem dado")).toBeInTheDocument()
    expect(screen.getByText("empate")).toBeInTheDocument()
  })
})
