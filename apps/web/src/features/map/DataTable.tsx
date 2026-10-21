import { useState } from "react"
import { formatPercent, formatVotes } from "@pulso/domain"

export interface TableRow {
  escopo: string
  lider: string
  partido: string
  votos: number | null
  percentual: number | null
  status: string
}

export function DataTable({ caption, rows }: { caption: string; rows: TableRow[] }) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const term = query.trim().toLowerCase()
  const filtered = term ? rows.filter((row) => row.escopo.toLowerCase().includes(term)) : rows
  const pageSize = 100
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(current * pageSize, (current + 1) * pageSize)
  return (
    <details className="data-table">
      <summary>Ver dados em tabela</summary>
      <label className="data-table__search">
        Buscar na tabela
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(0)
          }}
        />
      </label>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Escopo</th>
            <th scope="col">Líder</th>
            <th scope="col">Partido</th>
            <th scope="col">Votos</th>
            <th scope="col">% válidos</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <tr key={row.escopo}>
              <th scope="row">{row.escopo}</th>
              <td>{row.lider}</td>
              <td>{row.partido}</td>
              <td>{row.votos == null ? "—" : formatVotes(row.votos)}</td>
              <td>{row.percentual == null ? "—" : formatPercent(row.percentual)}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="data-table__pager">
        <span>
          {filtered.length === 0 ? "0" : current * pageSize + 1}–
          {Math.min((current + 1) * pageSize, filtered.length)} de {filtered.length}
        </span>
        <button
          type="button"
          onClick={() => setPage(Math.max(0, current - 1))}
          disabled={current === 0}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setPage(Math.min(totalPages - 1, current + 1))}
          disabled={current >= totalPages - 1}
        >
          Próxima
        </button>
      </div>
    </details>
  )
}
