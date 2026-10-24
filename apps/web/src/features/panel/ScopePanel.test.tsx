import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { ScopeSnapshot } from "@pulso/contracts"
import { ScopePanel } from "./ScopePanel"

  const snapshot: ScopeSnapshot = {
    apiVersion: "1",
    eleicao: "6257",
  versao: "6257:3550308:1:1",
  catalogVersion: "v1",
  status: "ok",
  retificado: false,
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
  escopo: { tipo: "municipio", id: "71072", nome: "SÃO PAULO", uf: "SP", ibge: 3550308 },
  cargo: { id: "1", nome: "Presidente", tipo: "majoritario" },
  origem: null,
  dados: {
    apuracao: { secoesTotalizadas: 100, secoesTotal: 100, percentual: 100, finalizada: true },
    resumo: {
      votosValidos: 100,
      brancos: 1,
      nulos: 1,
      comparecimento: 120,
      abstencao: 20,
      eleitorado: 140,
      basePercentual: "validos",
    },
    candidatos: [
      {
        id: "a",
        numero: "22",
        nome: "FULANO",
        nomeUrna: "FULANO",
        partido: "PL",
        votos: 60,
        percentual: 60,
        percentualBase: "calculado_validos",
        calculado: true,
        situacao: "Eleito",
        destinacao: "Válido",
        eleito: true,
      },
      {
        id: "b",
        numero: "13",
        nome: "BELTRANO",
        nomeUrna: "BELTRANO",
        partido: "PT",
        votos: 40,
        percentual: 40,
        percentualBase: "calculado_validos",
        calculado: true,
        situacao: "Não eleito",
        destinacao: "Válido",
        eleito: false,
      },
    ],
  },
}

describe("ScopePanel", () => {
  it("lista candidatos e resumo", () => {
    render(
      <ScopePanel
        snapshot={snapshot}
        cargos={[{ id: "1", nome: "Presidente" }]}
        activeCargo="1"
        onCargo={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByRole("heading", { name: "SÃO PAULO" })).toBeInTheDocument()
    expect(screen.getByText("FULANO")).toBeInTheDocument()
    expect(screen.getByText("BELTRANO")).toBeInTheDocument()
    expect(screen.getByText(/60,0%/)).toBeInTheDocument()
  })

  it("mostra ausência sem inventar candidato", () => {
    render(
      <ScopePanel
        snapshot={{ ...snapshot, status: "sem_dado", dados: null }}
        cargos={[{ id: "1", nome: "Presidente" }]}
        activeCargo="1"
        onCargo={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByText(/Sem dados para este cargo/)).toBeInTheDocument()
  })
})
