import { useEffect, useRef } from "react"
import type { ScopeSnapshot } from "@pulso/contracts"
import { formatPercent, formatVotes } from "@pulso/domain"

interface Props {
  snapshot: ScopeSnapshot
  cargos: Array<{ id: string; nome: string }>
  activeCargo: string
  onCargo: (id: string) => void
  onClose: () => void
}

export function ScopePanel({ snapshot, cargos, activeCargo, onCargo, onClose }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [snapshot.escopo.id, snapshot.cargo.id])
  const candidates = snapshot.dados?.candidatos ?? []
  const max = Math.max(1, ...candidates.map((candidate) => candidate.votos))
  const status = snapshot.status

  return (
    <aside className="panel" aria-labelledby="panel-title">
      <header className="panel__head">
        <div>
          <p className="panel__eyebrow">Município</p>
          <h2 id="panel-title" ref={heading} tabIndex={-1}>
            {snapshot.escopo.nome}
          </h2>
          <p className="panel__meta">
            {snapshot.escopo.uf} · {snapshot.dados?.apuracao.percentual.toFixed(1) ?? "0"}% apurado
            {snapshot.retificado ? " · retificado" : ""}
          </p>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={onClose}
          aria-label="Fechar painel"
        >
          Fechar
        </button>
      </header>

      <div className="panel__tabs" role="tablist" aria-label="Cargos">
        {cargos.map((cargo) => (
          <button
            key={cargo.id}
            type="button"
            role="tab"
            aria-selected={cargo.id === activeCargo}
            className={cargo.id === activeCargo ? "is-active" : ""}
            onClick={() => onCargo(cargo.id)}
          >
            {cargo.nome}
          </button>
        ))}
      </div>

      {status === "sem_dado" || status === "nao_aplicavel" ? (
        <p className="panel__empty">
          {status === "nao_aplicavel"
            ? "Este cargo não está em disputa neste município."
            : "Sem dados para este cargo neste município."}
        </p>
      ) : (
        <>
          <ol className="candidates">
            {candidates.map((candidate, index) => (
              <li key={candidate.id} className="candidate">
                <div className="candidate__line">
                  <span className="candidate__rank">{index + 1}º</span>
                  <strong>{candidate.nomeUrna}</strong>
                  <span className="candidate__party">
                    {candidate.numero} · {candidate.partido}
                  </span>
                  <span className="candidate__votes">
                    {formatVotes(candidate.votos)} · {formatPercent(candidate.percentual)}
                  </span>
                </div>
                <div className="candidate__bar" aria-hidden="true">
                  <span
                    ref={(element) =>
                      element?.style.setProperty(
                        "--candidate-width",
                        `${(candidate.votos / max) * 100}%`,
                      )
                    }
                  />
                </div>
                <span className="candidate__situation">{candidate.situacao}</span>
              </li>
            ))}
          </ol>
          <details className="panel__summary">
            <summary>Resumo do cargo</summary>
            <dl>
              <div>
                <dt>Votos válidos</dt>
                <dd>{formatVotes(snapshot.dados?.resumo.votosValidos ?? 0)}</dd>
              </div>
              <div>
                <dt>Brancos</dt>
                <dd>{formatVotes(snapshot.dados?.resumo.brancos ?? 0)}</dd>
              </div>
              <div>
                <dt>Nulos</dt>
                <dd>{formatVotes(snapshot.dados?.resumo.nulos ?? 0)}</dd>
              </div>
              <div>
                <dt>Comparecimento</dt>
                <dd>{formatVotes(snapshot.dados?.resumo.comparecimento ?? 0)}</dd>
              </div>
              <div>
                <dt>Abstenção</dt>
                <dd>{formatVotes(snapshot.dados?.resumo.abstencao ?? 0)}</dd>
              </div>
            </dl>
          </details>
        </>
      )}
    </aside>
  )
}
