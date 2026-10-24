interface ElectionSelectorProps {
  value: string
  onChange: (election: string) => void
}

export function ElectionSelector({ value, onChange }: ElectionSelectorProps) {
  return (
    <label className="election-selector">
      <span>Pleito</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="6258">2º turno de 2026 — ao vivo</option>
        <option value="6257">1º turno de 2026 — revisão</option>
      </select>
    </label>
  )
}
