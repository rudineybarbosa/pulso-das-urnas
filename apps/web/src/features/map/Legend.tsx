import type { Panorama } from "@pulso/contracts"

export function Legend({ panorama }: { panorama: Panorama }) {
  const parties = new Map<string, string>()
  for (const state of panorama.estados) {
    if (state.cor) parties.set(state.cor.sigla, state.cor.hex)
  }
  return (
    <div className="legend" aria-label="Legenda do mapa">
      <ul className="legend__parties">
        {[...parties.entries()].slice(0, 12).map(([sigla, hex]) => (
          <li key={sigla}>
            <span
              className="legend__chip legend__chip--party"
              ref={(element) => element?.style.setProperty("--legend-color", hex)}
              aria-hidden="true"
            />
            {sigla}
          </li>
        ))}
      </ul>
      <ul className="legend__states">
        <li>
          <span className="legend__chip legend__chip--empty" aria-hidden="true" />
          sem voto
        </li>
        <li>
          <span className="legend__chip legend__chip--nodata" aria-hidden="true" />
          sem dado
        </li>
        <li>
          <span className="legend__chip legend__chip--na" aria-hidden="true" />
          não se aplica
        </li>
        <li>
          <span className="legend__chip legend__chip--tie" aria-hidden="true" />
          empate
        </li>
      </ul>
    </div>
  )
}
