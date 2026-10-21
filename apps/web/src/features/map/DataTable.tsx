import { formatPercent, formatVotes } from "@pulso/domain"

export interface TableRow {
  escopo: string
  lider: string
  partido: string
  votos: number
  percentual: number
  status: string
}

export function DataTable({ caption, rows }: { caption: string; rows: TableRow[] }) {
  return (
    <details className="data-table">
      <summary>Ver dados em tabela</summary>
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
          {rows.map((row) => (
            <tr key={row.escopo}>
              <th scope="row">{row.escopo}</th>
              <td>{row.lider}</td>
              <td>{row.partido}</td>
              <td>{formatVotes(row.votos)}</td>
              <td>{formatPercent(row.percentual)}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
