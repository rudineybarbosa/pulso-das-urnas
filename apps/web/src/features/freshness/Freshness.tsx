import type { SourceInfo } from "@pulso/contracts"

export function Freshness({
  source,
  percent,
  onRefresh,
  refreshing,
}: {
  source: SourceInfo
  percent: number
  onRefresh: () => void
  refreshing: boolean
}) {
  const generated = new Date(source.generatedAt)
  const label =
    source.status === "ao_vivo"
      ? "Ao vivo"
      : source.status === "finalizado"
        ? "Apuração encerrada"
        : source.status === "desatualizado"
          ? "Dados desatualizados"
          : "Fonte indisponível"
  return (
    <div className={`freshness freshness--${source.status}`}>
      <span className="freshness__dot" aria-hidden="true" />
      <span className="freshness__label">{label}</span>
      <time dateTime={generated.toISOString()}>
        {generated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} (TSE)
      </time>
      <span>{percent.toFixed(1)}% apurado</span>
      <button
        type="button"
        className="button button--ghost"
        onClick={onRefresh}
        disabled={refreshing}
      >
        Atualizar
      </button>
    </div>
  )
}
