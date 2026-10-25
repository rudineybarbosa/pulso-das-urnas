import { formatPercent, formatVotes } from "@pulso/domain"

export interface RankingCandidate {
  id: string
  nomeUrna: string
  partido: string
  votos: number
  percentual: number
  cor?: string
}

function sourceTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "—"
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

export function CandidateRanking({
  title,
  total,
  percentual,
  generatedAt,
  candidates,
  hint = "Percentuais sobre os votos válidos apurados.",
}: {
  title: string
  total: number
  percentual: number
  generatedAt: string
  candidates: RankingCandidate[]
  hint?: string
}) {
  const ranked = [...candidates].sort((left, right) => right.votos - left.votos)
  return (
    <aside className="candidate-panel" aria-labelledby="candidate-panel-title">
      <h2 id="candidate-panel-title">{title}</h2>
      <p className="candidate-panel__total">
        <strong>{formatVotes(total)}</strong>
        <span> votos válidos</span>
      </p>
      <p className="candidate-panel__meta">
        {percentual.toFixed(1)}% apurado · TSE {sourceTime(generatedAt)}
      </p>
      {ranked.length > 0 ? (
        <ol className="candidate-panel__list" tabIndex={0} aria-label={`Ranking — ${title}`}>
          {ranked.map((candidate, index) => (
            <li className="candidate-panel__item" key={candidate.id}>
              <span className="candidate-panel__rank">{index + 1}</span>
              <span className="candidate-panel__color" aria-hidden="true">
                <svg viewBox="0 0 10 10" width="10" height="10">
                  <circle cx="5" cy="5" r="5" fill={candidate.cor ?? "#94a3b8"} />
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
        <p className="candidate-panel__meta">Aguardando votos do TSE.</p>
      )}
      <p className="candidate-panel__hint">{hint}</p>
    </aside>
  )
}
