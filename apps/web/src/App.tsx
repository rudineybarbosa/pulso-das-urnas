import { useEffect, useRef, useState } from "react"
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import type { Localidade, Panorama, ScopeSnapshot } from "@pulso/contracts"
import { BrazilMap } from "./features/map/BrazilMap"
import { StateMap } from "./features/map/StateMap"
import { Legend } from "./features/map/Legend"
import { DataTable, type TableRow } from "./features/map/DataTable"
import { SearchCombobox } from "./features/search/SearchCombobox"
import { ScopePanel } from "./features/panel/ScopePanel"
import { Freshness } from "./features/freshness/Freshness"
import { PulseMonitor } from "./features/race/PulseMonitor"
import { ElectionSelector } from "./features/election/ElectionSelector"
import {
  DEFAULT_ELECTION,
  useCargos,
  useLocalidades,
  useMunicipality,
  usePanorama,
  useScope,
} from "./lib/queries"
import { slugify } from "@pulso/domain"

const CARGO_FALLBACK = [
  { id: "1", nome: "Presidente" },
  { id: "3", nome: "Governador" },
  { id: "5", nome: "Senador" },
  { id: "6", nome: "Dep. Federal" },
  { id: "7", nome: "Dep. Estadual" },
  { id: "8", nome: "Dep. Distrital" },
]

function statusLabel(status: string): string {
  switch (status) {
    case "sem_voto":
      return "sem voto"
    case "sem_dado":
      return "sem dado"
    case "nao_aplicavel":
      return "não se aplica"
    case "sem_lider_elegivel":
      return "sem líder elegível"
    default:
      return "ok"
  }
}

function panoramaRows(panorama: Panorama): TableRow[] {
  return panorama.estados.map((state) => ({
    escopo: state.nome,
    lider: state.lider?.nome ?? "—",
    partido: state.lider?.partido ?? "—",
    votos: state.lider?.votos ?? null,
    percentual: state.lider?.percentual ?? null,
    status: statusLabel(state.status),
  }))
}

function scopeRows(snapshot: ScopeSnapshot): TableRow[] {
  return (snapshot.dados?.municipios ?? []).map((city) => ({
    escopo: city.nome,
    lider: city.lider?.nome ?? "—",
    partido: city.lider?.partido ?? "—",
    votos: city.lider?.votos ?? null,
    percentual: city.percentual,
    status: city.lider ? "ok" : "sem dado",
  }))
}

export function App() {
  const [params, setParams] = useSearchParams()
  const cargo = params.get("cargo") ?? "1"
  const election = params.get("pleito") ?? DEFAULT_ELECTION
  const navigate = useNavigate()
  const location = useLocation()
  const telao = location.pathname === "/telao"
  const queryClient = useQueryClient()
  const panorama = usePanorama(cargo, election)
  const [refreshing, setRefreshing] = useState(false)

  function chooseLocalidade(item: Localidade) {
    if (item.tipo === "estado") navigate(`/br/${item.uf.toLowerCase()}${location.search}`)
    else if (item.ibge) navigate(`/br/${item.uf.toLowerCase()}/${item.ibge}${location.search}`)
  }

  async function refresh() {
    setRefreshing(true)
    await queryClient.invalidateQueries()
    setRefreshing(false)
  }

  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      {telao ? null : (
        <header className="header">
          <div className="header__top">
            <Link to="/br" className="brand" aria-label="Pulso das Urnas, ir para o mapa do Brasil">
              <span className="brand__pulse" aria-hidden="true" />
              Pulso das Urnas
            </Link>
            <div className="header__meta">
              <span>
                {election === "6258" ? "Eleições 2026 · 2º turno" : "Eleições 2026 · 1º turno"}
              </span>
              {panorama.data ? (
                <Freshness
                  source={panorama.data.fonte}
                  percent={panorama.data.apuracao.percentual}
                  onRefresh={refresh}
                  refreshing={refreshing}
                />
              ) : null}
            </div>
          </div>
          <div className="header__controls">
            <ElectionSelector
              value={election}
              onChange={(nextElection) => {
                const next = new URLSearchParams(params)
                next.set("pleito", nextElection)
                setParams(next, { replace: true })
              }}
            />
            <nav className="chips" aria-label="Cargo">
              {CARGO_FALLBACK.map((office) => (
                <button
                  key={office.id}
                  type="button"
                  className={`chip ${cargo === office.id ? "is-active" : ""}`}
                  aria-pressed={cargo === office.id}
                  onClick={() => {
                    const next = new URLSearchParams(params)
                    next.set("cargo", office.id)
                    setParams(next, { replace: true })
                  }}
                >
                  {office.nome}
                </button>
              ))}
            </nav>
            <SearchCombobox onSelect={chooseLocalidade} />
          </div>
        </header>
      )}

      <main id="conteudo" className={`main ${telao ? "main--telao" : ""}`}>
        {panorama.data?.modo === "fake" ? (
          <p className="demo-banner" role="status">
            Modo de demonstração: votos simulados. Fonte e horário são do simulador local.
          </p>
        ) : null}
        <Routes>
          <Route path="/" element={<Navigate to="/br" replace />} />
          <Route
            path="/br"
            element={
              panorama.data ? (
                <section className="view" aria-labelledby="view-title">
                  <div className="view__head">
                    <h1 id="view-title">O país em um mapa</h1>
                    <p>
                      A cor de cada estado é o partido que lidera o maior cargo em disputa. Clique
                      em um estado para ver os municípios.
                    </p>
                  </div>
                  <BrazilMap
                    panorama={panorama.data}
                    onSelect={(uf) => navigate(`/br/${uf.toLowerCase()}`)}
                  />
                  <Legend panorama={panorama.data} />
                  <DataTable
                    caption={`Liderança por estado — ${panorama.data.cargoSelecionado.nome}`}
                    rows={panoramaRows(panorama.data)}
                  />
                </section>
              ) : (
                <Loading error={panorama.error} />
              )
            }
          />
          <Route path="/telao" element={<TelaoPage election={election} />} />
          <Route path="/br/:uf" element={<StatePage cargo={cargo} election={election} />} />
          <Route path="/br/:uf/:city" element={<StatePage cargo={cargo} election={election} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {telao ? null : <PulseMonitor election={election} active={!refreshing} />}

      {telao ? null : (
        <footer className="footer">
          <p>
            Fonte: Tribunal Superior Eleitoral. Dados públicos, exibidos com o horário de geração.
          </p>
          <p>Este site não é um serviço oficial do TSE.</p>
          <p>Sem cookies de rastreio · acessibilidade WCAG 2.2 AA · arte original</p>
        </footer>
      )}
    </div>
  )
}

function TelaoPage({ election }: { election: string }) {
  const panorama = usePanorama("1", election)
  const navigate = useNavigate()
  if (!panorama.data) return <Loading error={panorama.error} />
  return (
    <section className="view view--telao" aria-labelledby="telao-title">
      <h1 id="telao-title">Pulso das Urnas — telão</h1>
      <BrazilMap panorama={panorama.data} onSelect={(uf) => navigate(`/br/${uf.toLowerCase()}`)} />
      <Legend panorama={panorama.data} />
      <p className="view__head">
        Atualização automática · {panorama.data.apuracao.percentual.toFixed(1)}% apurado
      </p>
    </section>
  )
}

function StatePage({ cargo, election }: { cargo: string; election: string }) {
  const { uf = "", city } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const upper = uf.toUpperCase()
  const parsedIbge = city && /^\d+$/.test(city) ? Number.parseInt(city, 10) : 0
  const search = useLocalidades(city && !parsedIbge ? city.replace(/-/g, " ") : "")
  const slugMatch = search.data?.resultados.find(
    (item) => item.tipo === "municipio" && item.slug === city && item.uf === upper,
  )
  const ibge = parsedIbge || slugMatch?.ibge || 0
  const scope = useScope(upper, "1", election, Boolean(upper))
  const municipality = useMunicipality(ibge, cargo, election, Boolean(ibge))
  const cargos = useCargos(ibge)
  const [localCargo, setLocalCargo] = useState(cargo)
  const activeCargo = localCargo
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    setLocalCargo(cargo)
  }, [cargo])

  useEffect(() => {
    if (!parsedIbge || !municipality.data) return
    const slug = slugify(municipality.data.escopo.nome)
    if (slug && slug !== city) {
      navigate(`/br/${uf.toLowerCase()}/${slug}${location.search}`, { replace: true })
    }
  }, [city, location.search, municipality.data, navigate, parsedIbge, uf])

  useEffect(() => {
    heading.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        navigate(city ? `/br/${uf.toLowerCase()}` : "/br")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [city, navigate, uf])

  if (!scope.data) return <Loading error={scope.error} />

  const panel = municipality.data
  const cargosList = cargos.data?.cargos?.length ? cargos.data.cargos : CARGO_FALLBACK

  return (
    <section className="view view--state" aria-labelledby="state-title">
      <div className="view__head">
        <button
          type="button"
          className="button button--back"
          onClick={() => navigate(city ? `/br/${uf.toLowerCase()}` : "/br")}
        >
          ← Voltar
        </button>
        <h1 id="state-title" ref={heading} tabIndex={-1}>
          {scope.data.escopo.nome}
        </h1>
        <p>
          {scope.data.cargo.nome} · {scope.data.dados?.apuracao.percentual.toFixed(1) ?? "0"}%
          apurado
        </p>
      </div>
      <div className={`state-layout ${panel ? "has-panel" : ""}`}>
        <StateMap
          uf={upper}
          ibge={scope.data.escopo.ibge ?? 0}
          snapshot={scope.data}
          onSelect={(code) => navigate(`/br/${uf.toLowerCase()}/${code}`)}
        />
        {panel ? (
          <ScopePanel
            snapshot={panel}
            cargos={cargosList}
            activeCargo={activeCargo}
            onCargo={(id) => {
              setLocalCargo(id)
              navigate(`/br/${uf.toLowerCase()}/${ibge}?cargo=${id}`, { replace: true })
            }}
            onClose={() => navigate(`/br/${uf.toLowerCase()}`)}
          />
        ) : null}
      </div>
      <DataTable
        caption={`Municípios de ${scope.data.escopo.nome} — ${scope.data.cargo.nome}`}
        rows={scopeRows(scope.data)}
      />
    </section>
  )
}

function Loading({ error }: { error: unknown }) {
  return (
    <div className="state-message" role="status">
      {error ? (
        <>
          <strong>Não foi possível consultar os dados.</strong>
          <span>{error instanceof Error ? error.message : "Tente novamente."}</span>
        </>
      ) : (
        <span>Buscando os dados do TSE…</span>
      )}
    </div>
  )
}

function NotFound() {
  return (
    <div className="state-message">
      <strong>Não encontramos esse recorte.</strong>
      <Link to="/br">Voltar ao mapa do Brasil</Link>
    </div>
  )
}
