import { useEffect, useRef, useState } from "react"
import { detectOvertake, formatPercent, formatVotes } from "@pulso/domain"
import { useRace } from "../../lib/queries"

const SCENE_KEY = (pleito: string, cargo: string) => `pulso:final-scene:${pleito}:${cargo}`

const MOTIF = "M0 0 H10 L14 -5 L18 8 L22 -26 L26 18 L30 -8 L34 2 H52 L58 0 H80"

const HEART =
  "M600 76 C600 76 566 54 566 36 C566 24 576 16 587 16 C594 16 600 22 600 22 C600 22 606 16 613 16 C624 16 634 24 634 36 C634 54 600 76 600 76 Z"

interface Channel {
  id: string
  nome: string
  partido: string
  cor: string
  votos: number
  percentual: number
  lider: boolean
  y: number
}

export function PulseMonitor({ election = "6257", active = true }: { election?: string; active?: boolean }) {
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem("pulso:paused") === "1"
    } catch {
      return false
    }
  })
  const { data } = useRace(election, active && !paused)
  const [alarm, setAlarm] = useState(false)
  const [scene, setScene] = useState(false)
  const tracker = useRef({ previousG: 0, streak: 0, lastAt: 0 })
  const alarmTimer = useRef<number | null>(null)
  const sceneKey = data ? SCENE_KEY(data.pleito.id, data.cargo.id) : null

  const difference = data?.diferenca.normalizada ?? 0
  const magnitude = Math.min(1, Math.abs(difference) * 12)
  const gap = 4 + 16 * magnitude
  const leaderId = data?.diferenca.lider ?? null
  const leaderName = (data?.cavalos ?? []).find((horse) => horse.candidatoId === leaderId)?.nomeUrna
  const center = 46
  const channels: Channel[] = (data?.cavalos ?? []).map((horse) => {
    const lider = horse.candidatoId === leaderId || (!leaderId && horse.posicao === 1)
    return {
      id: horse.candidatoId,
      nome: horse.nomeUrna,
      partido: horse.partido,
      cor: horse.cor,
      votos: horse.votos,
      percentual: horse.percentual,
      lider,
      y: data?.interesses === "sem_voto" ? center : center + (lider ? -gap : gap),
    }
  })

  useEffect(() => {
    if (!data) return
    const result = detectOvertake(tracker.current, difference, Date.now(), 30_000)
    tracker.current = result
    if (result.overtake) {
      setAlarm(true)
      if (alarmTimer.current) window.clearTimeout(alarmTimer.current)
      alarmTimer.current = window.setTimeout(() => setAlarm(false), 1_600)
    }
  }, [data, difference])

  useEffect(() => {
    if (!sceneKey || data?.interesses !== "finalizado") return
    if (sessionStorage.getItem(sceneKey) === "1") return
    sessionStorage.setItem(sceneKey, "1")
    setScene(true)
  }, [sceneKey, data?.interesses])

  function togglePause() {
    const next = !paused
    setPaused(next)
    try {
      localStorage.setItem("pulso:paused", next ? "1" : "0")
    } catch {
      /* armazenamento indisponível */
    }
  }

  return (
    <section
      className={`pulse ${paused ? "is-paused" : ""} ${data?.interesses === "finalizado" ? "is-final" : ""}`}
      aria-labelledby="pulse-title"
    >
      <div className="pulse__bezel">
        <div className="pulse__head">
          <h2 id="pulse-title">
            <span className="pulse__heart-icon" aria-hidden="true">
              ♥
            </span>
            Monitor da apuração
          </h2>
          <div className="pulse__status" aria-hidden="true">
            <span className="pulse__bpm">BPM {data ? 72 + Math.round(magnitude * 20) : "--"}</span>
            <span className="pulse__coffee">☕</span>
          </div>
          <div className="pulse__controls">
            {data?.interesses === "finalizado" ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setScene(false)
                  window.setTimeout(() => setScene(true), 60)
                }}
              >
                Rever cena
              </button>
            ) : null}
            <button type="button" className="button button--ghost" onClick={togglePause}>
              {paused ? "Retomar" : "Pausar"}
            </button>
          </div>
        </div>

        <div className="pulse__screen">
          <svg
            viewBox="0 0 1200 90"
            preserveAspectRatio="none"
            className="pulse__svg"
            role="img"
            aria-labelledby="pulse-desc"
          >
            <title id="pulse-desc">
              Monitor com duas linhas de pulso, uma por candidato; a linha mais alta é a do líder.
            </title>
            <defs>
              <path id="pulse-motif" d={MOTIF} />
              <pattern id="pulse-grid" width="30" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M30 0H0V24"
                  fill="none"
                  stroke="rgba(125, 211, 252, .12)"
                  strokeWidth="1"
                />
              </pattern>
              <linearGradient id="pulse-fade" x1="0" x2="1">
                <stop offset="0" stopColor="#071a18" stopOpacity="1" />
                <stop offset="0.08" stopColor="#071a18" stopOpacity="0" />
                <stop offset="0.92" stopColor="#071a18" stopOpacity="0" />
                <stop offset="1" stopColor="#071a18" stopOpacity="1" />
              </linearGradient>
            </defs>
            <rect width="1200" height="90" fill="#071a18" />
            <rect width="1200" height="90" fill="url(#pulse-grid)" />
            {channels.map((channel) => (
              <g
                key={channel.id}
                transform={`translate(0 ${channel.y})`}
                className="pulse__channel"
              >
                <g className="pulse__scroll">
                  {Array.from({ length: 16 }, (_, index) => (
                    <use
                      key={index}
                      href="#pulse-motif"
                      x={index * 80}
                      className="pulse__trace"
                      style={{ stroke: channel.cor, opacity: channel.lider ? 1 : 0.55 }}
                      strokeWidth={channel.lider ? 3.4 : 2.4}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
                <circle
                  cx="1186"
                  cy="0"
                  r={channel.lider ? 5 : 4}
                  fill={channel.cor}
                  className="pulse__dot"
                />
              </g>
            ))}
            {channels.length < 2 ? (
              <text x="600" y="48" textAnchor="middle" className="pulse__empty">
                {channels.length === 0
                  ? "Aguardando o primeiro boletim de urna"
                  : "Aguardando o segundo colocado"}
              </text>
            ) : null}
            {scene ? (
              <g className="pulse__heart">
                <path d={HEART} fill={channels[0]?.cor ?? "#7DD3FC"} opacity="0.92" />
              </g>
            ) : null}
            <rect width="1200" height="90" fill="url(#pulse-fade)" pointerEvents="none" />
          </svg>
          {alarm ? <div className="pulse__alarm">PULSO!</div> : null}
          {data?.interesses === "finalizado" ? (
            <p className="pulse__result">Apuração encerrada. {channels[0]?.nome} venceu.</p>
          ) : null}
        </div>

        <div className="pulse__readouts">
          {channels.map((channel) => (
            <div className="pulse__readout" key={channel.id}>
              <span
                className="pulse__party"
                style={{ background: channel.cor }}
                aria-hidden="true"
              />
              <strong>{channel.nome}</strong>
              <span>
                {formatVotes(channel.votos)} votos · {formatPercent(channel.percentual)}
              </span>
            </div>
          ))}
          <span className="pulse__hint">
            A linha mais alta lidera. Distância = diferença de votos.
          </span>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {alarm ? `Virada: ${leaderName ?? "o segundo colocado"} assume a liderança.` : ""}
        {data?.interesses === "finalizado"
          ? `Apuração encerrada. ${channels[0]?.nome ?? ""} venceu.`
          : ""}
      </p>
    </section>
  )
}
