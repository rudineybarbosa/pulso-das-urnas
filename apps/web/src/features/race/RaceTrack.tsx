import { useEffect, useRef, useState } from "react"
import { detectOvertake, formatPercent, formatVotes, racePositions } from "@pulso/domain"
import { useRace } from "../../lib/queries"
import { Horse } from "./Horse"

const SCENE_KEY = (id: string) => `pulso:final-scene:6257:${id}`

export function RaceTrack({ active = true }: { active?: boolean }) {
  const [paused, setPaused] = useState(() => localStorage.getItem("pulso:paused") === "1")
  const { data } = useRace(active && !paused)
  const [bubble, setBubble] = useState<string | null>(null)
  const [scene, setScene] = useState<"winner" | "loser" | null>(null)
  const tracker = useRef({ previousG: 0, streak: 0, lastAt: 0 })
  const bubbleTimer = useRef<number | null>(null)

  const positions = data
    ? racePositions({
        progress: data.apuracao.percentual,
        votesA: data.cavalos[0]?.votos ?? 0,
        votesB: data.cavalos[1]?.votos ?? 0,
        validVotes: (data.cavalos[0]?.votos ?? 0) + (data.cavalos[1]?.votos ?? 0),
      })
    : null

  useEffect(() => {
    if (!data || !positions) return
    const result = detectOvertake(tracker.current, positions.g, Date.now(), 30_000)
    tracker.current = result
    if (result.overtake && data.cavalos[0]) {
      setBubble(data.cavalos[0].partido)
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current)
      bubbleTimer.current = window.setTimeout(() => setBubble(null), 1_200)
    }
  }, [data?.versao, positions, data])

  useEffect(() => {
    if (!data || data.interesses !== "finalizado") return
    const key = SCENE_KEY("1")
    if (sessionStorage.getItem(key) === "1") return
    sessionStorage.setItem(key, "1")
    setScene("winner")
    const timer = window.setTimeout(() => setScene(null), 2_600)
    return () => window.clearTimeout(timer)
  }, [data])

  function togglePause() {
    const next = !paused
    setPaused(next)
    localStorage.setItem("pulso:paused", next ? "1" : "0")
  }

  const horses = data?.cavalos ?? []
  const leaderId = data?.diferenca.lider

  return (
    <section className="race" aria-labelledby="race-title">
      <div className="race__head">
        <h2 id="race-title">A corrida da apuração</h2>
        <div className="race__controls">
          {paused ? <span className="race__paused">Pausada</span> : null}
          <button type="button" className="button button--ghost" onClick={togglePause}>
            {paused ? "Retomar" : "Pausar animação"}
          </button>
        </div>
      </div>
      <p className="race__hint">
        Avanço = percentual apurado. Distância = diferença de votos. Dados simulados no modo local.
      </p>
      <div className="race__track" aria-hidden="true">
        <div className="race__finish" />
        {horses.map((horse, index) => {
          const x = positions ? (index === 0 ? positions.xA : positions.xB) : 0.1
          const final = scene ? (horse.candidatoId === leaderId ? "winner" : "loser") : null
          return (
            <div
              className={`race__lane ${paused ? "is-paused" : ""}`}
              key={horse.candidatoId}
              style={{
                transform: `translateX(${Math.max(0, Math.min(0.86, x)) * 100}%)`,
              }}
            >
              <div className="race__label">
                <strong>{horse.nomeUrna}</strong>
                <span>{horse.partido}</span>
              </div>
              <Horse color={horse.cor} number={undefined} final={final} />
              {bubble === horse.partido ? <div className="race__bubble">Relincho!</div> : null}
            </div>
          )
        })}
      </div>
      <div className="race__numbers">
        {horses.map((horse) => (
          <div key={horse.candidatoId} className="race__number">
            <span className="race__party" style={{ background: horse.cor }} aria-hidden="true" />
            <strong>{horse.nomeUrna}</strong>
            <span>
              {formatVotes(horse.votos)} votos · {formatPercent(horse.percentual)}
            </span>
          </div>
        ))}
      </div>
      {data?.interesses === "finalizado" ? (
        <p className="race__result">
          Apuração encerrada. {horses[0]?.nomeUrna ?? "O líder"} venceu.
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {bubble ? `Virada: ${bubble} assume a liderança.` : ""}
        {scene ? "Apuração encerrada. O vencedor comemora com o segundo colocado." : ""}
      </p>
    </section>
  )
}
