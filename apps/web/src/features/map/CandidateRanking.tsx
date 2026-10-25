import type { Panorama } from "@pulso/contracts"
import { formatPercent, formatVotes } from "@pulso/domain"

function sourceTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "—"
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

export function CandidateRanking({ panorama }: { panorama: Panorama }) {
  const candidates = [...(panorama.candidatos ?? [])].sort(
    (left, right) => right.votos - left.votos,
  )
  return (
    <aside className="candidate-panel" aria-labelledby="candidate-panel-title">
      <h2 id="candidate-panel-title">{panorama.cargoEmDestaque.nome} · nacional</h2>
      <p className="candidate-panel__total">
        <strong>{formatVotes(panorama.resumo.votosValidos)}</strong>
        <span> votos válidos</span>
      </p>
      <p className="candidate-panel__meta">
        {panorama.apuracao.percentual.toFixed(1)}% apurado · TSE{" "}
        {sourceTime(panorama.fonte.generatedAt)}
      </p>
      {candidates.length > 0 ? (
        <ol className="candidate-panel__list">
          {candidates.map((candidate, index) => (
            <li className="candidate-panel__item" key={candidate.id}>
              <span className="candidate-panel__rank">{index + 1}</span>
              <span className="candidate-panel__color" aria-hidden="true">
                <svg viewBox="0 0 10 10" width="10" height="10">
                  <circle cx="5" cy="5" r="5" fill={candidate.cor} />
                </svg>
              </span>
              <span className="candidate-panel__identity">
                <strong>{candidate.nomeUrna}</strong>
                <small>{candidate.partido}</small>
              </span>
              <strong className="candidate-panel__percent">
                {formatPercent(candidate.percentual)}
              </strong>
              <span className="candidate-panel__votes">{formatVotes(candidate.votos)} votos</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="candidate-panel__meta">Aguardando votos nacionais do TSE.</p>
      )}
      <p className="candidate-panel__hint">Percentuais sobre os votos válidos apurados.</p>
    </aside>
  )
}
