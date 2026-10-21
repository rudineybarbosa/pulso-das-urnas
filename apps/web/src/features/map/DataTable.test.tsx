import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { DataTable } from "./DataTable"

describe("DataTable", () => {
  it("expõe os mesmos dados do mapa em tabela", () => {
    render(
      <DataTable
        caption="Liderança por estado"
        rows={[
          {
            escopo: "São Paulo",
            lider: "FULANO",
            partido: "PL",
            votos: 1000,
            percentual: 55.5,
            status: "ok",
          },
        ]}
      />,
    )
    expect(screen.getByText("Ver dados em tabela")).toBeInTheDocument()
    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByText("São Paulo")).toBeInTheDocument()
    expect(screen.getByText("55,5%")).toBeInTheDocument()
  })
})
