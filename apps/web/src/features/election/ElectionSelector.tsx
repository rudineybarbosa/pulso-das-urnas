interface ElectionSelectorProps {
  value: string
  onChange: (election: string) => void
}

const STATIC = import.meta.env.VITE_STATIC_MODE === "true"

export function ElectionSelector({ value, onChange }: ElectionSelectorProps) {
  return (
    <label className="election-selector">
      <span>Pleito</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="6258">
          {STATIC ? "2º turno de 2026 — resultado final" : "2º turno de 2026 — ao vivo"}
        </option>
        <option value="6257">1º turno de 2026 — revisão</option>
      </select>
    </label>
  )
}
