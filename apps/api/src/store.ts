import { existsSync, readFileSync } from "node:fs"
import type { SnapshotRepository } from "@pulso/cloud"
import { fetchTseJson } from "@pulso/tse"
import { join } from "node:path"
import type {
  Apuracao,
  Candidate,
  Office,
  Panorama,
  PartyColor,
  Pleito,
  Race,
  Resumo,
  ScopeSnapshot,
  SourceInfo,
  StateSummary,
} from "@pulso/contracts"
import {
  computeShare,
  isEligible,
  nextLeader,
  orderCandidates,
  pickLeader,
  racePositions,
  resolvePartyColor,
  resolveStatus,
} from "@pulso/domain"
import {
  findRepoRoot,
  loadCatalog,
  loadMunicipalities,
  loadResult,
  loadResultFile,
  parseResult,
  presidentFixture,
  stateFixture,
  UF_CODES,
  UF_NAMES,
  type ParsedOffice,
  type ParsedScope,
} from "@pulso/tse"

type MunicipalityRow = NonNullable<NonNullable<ScopeSnapshot["dados"]>["municipios"]>[number]

export type DataMode = "fake" | "real"
export type Scenario =
  | "sem-votos"
  | "parcial"
  | "virada"
  | "empate"
  | "fim"
  | "erro-fonte"
  | "dois-turnos"
  | "dois-turnos-parcial"
  | "retificacao"
  | "suplementar"
  | "catalogo-alterado"
  | "candidato-removido"
  | "offline"
  | "geometria-ausente"

export interface StoreOptions {
  mode?: DataMode
  scenario?: Scenario
  speed?: number
  now?: () => number
  repository?: SnapshotRepository
}

interface PartyTable {
  [sigla: string]: { hex: string; fonte?: string }
}

const PRESIDENT = "1"
const GOVERNOR = "3"
const FIRST_ELECTION = "6257"
const SECOND_ELECTION = "6258"

const CITY_PANEL_TTL_MS = 15_000
const CITY_ROWS_TTL_MS = 120_000
const MUNICIPAL_REFRESH_MS = 120_000
const MUNICIPAL_FRESH_MS = 180_000
const PANEL_FRESH_MS = 30_000
const MUNICIPAL_BATCH = 16
const TSE_MIN_INTERVAL_MS = 400

function readPartyTable(): PartyTable {
  const path = join(findRepoRoot(), "data", "party-colors.json")
  return JSON.parse(readFileSync(path, "utf8")) as PartyTable
}

function hashNumber(value: string): number {
  let hash = 0
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

function round(value: number): number {
  return Math.round(value)
}

export class DataStore {
  readonly mode: DataMode
  readonly scenario: Scenario
  private readonly speed: number
  private readonly now: () => number
  private readonly startedAt: number
  private readonly catalog = loadCatalog()
  private readonly municipalities = loadMunicipalities()
  private readonly partyTable = readPartyTable()
  private readonly byUf = new Map<string, Map<string, ParsedScope>>()
  private readonly cityCache = new Map<string, { at: number; parsed: ParsedScope; etag?: string }>()
  private readonly cityCollectedAt = new Map<string, string>()
  private readonly cityInflight = new Map<string, Promise<ParsedScope | null>>()
  private readonly leaderState = new Map<
    string,
    { leader: { id: string; votos: number } | null; streak: number; lastAt: number }
  >()
  private readonly nationalPresident: ParsedScope | null
  private readonly secondTurnPresident: ParsedScope | null
  private readonly repository?: SnapshotRepository
  private readonly remoteNational = new Map<string, ParsedScope>()
  private readonly remoteByUf = new Map<string, Map<string, ParsedScope>>()
  private readonly remoteRefreshedAt = new Map<string, number>()
  private readonly remoteRefreshInflight = new Map<string, Promise<void>>()
  private readonly remoteCollectedAt = new Map<string, string>()
  private readonly municipalityRows = new Map<string, Map<number, MunicipalityRow>>()
  private readonly municipalityLoaded = new Map<string, Set<number>>()
  private readonly municipalityTimes = new Map<string, Map<number, string>>()
  private readonly municipalityVersion = new Map<string, number>()
  private readonly municipalitySweepAt = new Map<string, number>()
  private readonly municipalitySweepInflight = new Map<string, Promise<void>>()
  private tseQueue: Promise<void> = Promise.resolve()
  private lastTseRequestAt = 0
  private repositoryActive = 0
  private repositoryQueue: Array<() => void> = []

  constructor(options: StoreOptions = {}) {
    this.mode = options.mode ?? "fake"
    this.scenario = options.scenario ?? "parcial"
    this.speed = options.speed ?? 600
    this.now = options.now ?? (() => Date.now())
    this.repository = options.repository
    this.startedAt = this.now()
    this.nationalPresident = this.tryLoad("2026/6257/br-c0001-e006257-u.json")
    this.secondTurnPresident = this.tryLoad("2026/6258/br-c0001-e006258-u.json")
    for (const [uf] of UF_CODES) {
      const offices = new Map<string, ParsedScope>()
      try {
        offices.set(PRESIDENT, this.load(presidentFixture(uf)))
      } catch {
        /* estado sem arquivo é sem_dado */
      }
      for (const code of ["3", "5", "6", "7", "8"]) {
        try {
          offices.set(code, this.load(stateFixture(uf, code)))
        } catch {
          /* cargo indisponível naquele estado */
        }
      }
      this.byUf.set(uf, offices)
    }
  }

  private load(relative: string): ParsedScope {
    if (this.mode === "real") {
      const snapshot = join(findRepoRoot(), "data", "snapshots", "raw", relative)
      if (!existsSync(snapshot)) throw new Error(`snapshot real ausente: ${relative}`)
      return loadResultFile(snapshot)
    }
    return loadResult(relative)
  }

  private tryLoad(relative: string): ParsedScope | null {
    try {
      return this.load(relative)
    } catch {
      return null
    }
  }

  private async loadCity(
    uf: string,
    tse: string,
    code: string,
    election = FIRST_ELECTION,
    acceptStale = false,
    allowFetch = true,
  ): Promise<ParsedScope | null> {
    const key = `${election}:${uf}:${tse}:${code}`
    const local = this.tryLoad(
      `2026/${election}/${uf.toLowerCase()}${tse}-c000${code}-e00${election}-u.json`,
    )
    if (local) return local
    const ttl = acceptStale ? CITY_ROWS_TTL_MS : CITY_PANEL_TTL_MS
    const cached = this.cityCache.get(key)
    if (cached && this.now() - cached.at < ttl) return cached.parsed
    if (cached && !acceptStale) {
      void this.refreshCity(uf, tse, code, election)
      return cached.parsed
    }
    let parsed = cached?.parsed ?? null
    if (this.repository) {
      const remote = await this.readCitySnapshot(uf, tse, code, election)
      if (remote) {
        parsed = remote.parsed
        if (!acceptStale) {
          this.refreshCityIfStale(
            uf,
            tse,
            code,
            election,
            this.isLiveElection(election) ? PANEL_FRESH_MS : Number.POSITIVE_INFINITY,
          )
        }
      }
    }
    if (!parsed) {
      if (this.mode !== "real" || !allowFetch) return null
      return this.refreshCity(uf, tse, code, election)
    }
    if (acceptStale && allowFetch) {
      this.refreshCityIfStale(
        uf,
        tse,
        code,
        election,
        this.isLiveElection(election) ? MUNICIPAL_FRESH_MS : Number.POSITIVE_INFINITY,
      )
    }
    return parsed
  }

  private isLiveElection(election: string): boolean {
    return election === SECOND_ELECTION || election === "6260"
  }

  private refreshCityIfStale(
    uf: string,
    tse: string,
    code: string,
    election: string,
    freshMs: number,
  ): void {
    const key = `${election}:${uf}:${tse}:${code}`
    const collectedAt = this.cityCollectedAt.get(key)
    if (collectedAt && this.now() - Date.parse(collectedAt) < freshMs) return
    void this.refreshCity(uf, tse, code, election)
  }

  /**
   * Fecha a torneira do Storage/Firestore quando muitas abas abrem estados ao
   * mesmo tempo. Sem isso, 27 varreduras concorrentes saturam a instância.
   */
  private async withRepositorySlot<T>(task: () => Promise<T>): Promise<T> {
    if (this.repositoryActive >= 24) {
      await new Promise<void>((resolve) => this.repositoryQueue.push(resolve))
    }
    this.repositoryActive += 1
    try {
      return await task()
    } finally {
      this.repositoryActive -= 1
      this.repositoryQueue.shift()?.()
    }
  }

  private async readCitySnapshot(
    uf: string,
    tse: string,
    code: string,
    election: string,
  ): Promise<{ parsed: ParsedScope; collectedAt: string; etag?: string } | null> {
    if (!this.repository) return null
    const remote = await this.withRepositorySlot(() =>
      this.repository!.getCurrent({
        ciclo: "ele2026",
        pleito: election,
        escopo: `${uf.toLowerCase()}${tse}`,
        cargo: code,
      }),
    )
    if (!remote) return null
    const parsed = parseResult(remote.body as never)
    const key = `${election}:${uf}:${tse}:${code}`
    const etag = remote.pointer.etag ?? undefined
    const collectedAt = remote.pointer.collectedAt ?? parsed.generatedAt
    this.cityCache.set(key, { at: this.now(), parsed, etag })
    this.cityCollectedAt.set(key, collectedAt)
    return { parsed, collectedAt, etag }
  }

  private async refreshCity(
    uf: string,
    tse: string,
    code: string,
    election: string,
  ): Promise<ParsedScope | null> {
    const key = `${election}:${uf}:${tse}:${code}`
    const cached = this.cityCache.get(key)
    const inflight = this.cityInflight.get(key)
    if (inflight) return inflight
    if (this.mode !== "real") return cached?.parsed ?? null
    const url = `https://resultados.tse.jus.br/oficial/ele2026/${election}/dados/${uf.toLowerCase()}/${uf.toLowerCase()}${tse}-c000${code}-e00${election}-u.json`
    const task = (async () => {
      await this.waitTseSlot()
      try {
        const result = await fetchTseJson(url, { etag: cached?.etag })
        if (result.notModified || !result.body) return cached?.parsed ?? null
        const parsed = parseResult(result.body as never)
        const collectedAt = new Date(this.now()).toISOString()
        this.cityCache.set(key, { at: this.now(), parsed, etag: result.etag ?? undefined })
        this.cityCollectedAt.set(key, collectedAt)
        if (this.repository) {
          await this.withRepositorySlot(() =>
            this.repository!.putIfNewer({
              ciclo: "ele2026",
              pleito: election,
              escopo: `${uf.toLowerCase()}${tse}`,
              cargo: code,
              idg: parsed.generationId,
              generatedAt: parsed.generatedAt,
              collectedAt,
              parserVersion: "1.0.0",
              etag: result.etag,
              body: result.body,
            }),
          ).catch((error: unknown) => {
            console.error(
              `falha ao gravar município no cache compartilhado: ${uf}${tse} c${code}`,
              error instanceof Error ? error.message : String(error),
            )
          })
        }
        return parsed
      } catch {
        return cached?.parsed ?? null
      }
    })().finally(() => this.cityInflight.delete(key))
    this.cityInflight.set(key, task)
    return task
  }

  /**
   * Uma única fila por instância limita as consultas ao TSE a menos de 3 por
   * segundo, mesmo quando vários municípios são carregados em paralelo.
   */
  private waitTseSlot(): Promise<void> {
    const previous = this.tseQueue
    let release: () => void = () => {}
    this.tseQueue = new Promise<void>((resolve) => {
      release = resolve
    })
    return previous.then(async () => {
      const wait = Math.max(0, this.lastTseRequestAt + TSE_MIN_INTERVAL_MS - Date.now())
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
      this.lastTseRequestAt = Date.now()
      release()
    })
  }

  progress(): number {
    if (this.mode === "real") return 100
    if (this.scenario === "sem-votos" || this.scenario === "dois-turnos") return 0
    if (this.scenario === "fim" || this.scenario === "empate") return 100
    if (this.scenario === "dois-turnos-parcial") return 40
    if (
      this.scenario === "parcial" ||
      this.scenario === "erro-fonte" ||
      this.scenario === "offline" ||
      this.scenario === "retificacao" ||
      this.scenario === "suplementar" ||
      this.scenario === "catalogo-alterado" ||
      this.scenario === "candidato-removido"
    ) {
      return 60
    }
    if (this.scenario === "virada") {
      const elapsed = (this.now() - this.startedAt) / 1000
      return Math.min(100, Math.round(elapsed * this.speed * 0.2))
    }
    return 60
  }

  private finished(): boolean {
    return this.mode === "real" ? true : this.scenario === "fim"
  }

  private source(
    parsed: ParsedScope | null,
    scope = "br",
    generation = "fake",
    election = parsed?.electionId ?? FIRST_ELECTION,
  ): SourceInfo {
    const now = this.now()
    if (this.mode === "real") {
      if (!parsed) {
        return {
          nome: "Tribunal Superior Eleitoral",
          url: `https://resultados.tse.jus.br/oficial/ele2026/${election}/dados/${scope}/`,
          generationId: "",
          generatedAt: new Date(0).toISOString(),
          collectedAt: new Date(now).toISOString(),
          parserVersion: "1.0.0",
          status: "fonte_indisponivel",
          sourceAgeSeconds: 999_999,
          collectedAgeSeconds: 999_999,
          snapshotAgeSeconds: 999_999,
        }
      }
      return {
        nome: "Tribunal Superior Eleitoral",
        url: `https://resultados.tse.jus.br/oficial/ele2026/${election}/dados/${scope}/`,
        generationId: parsed.generationId,
        generatedAt: parsed.generatedAt,
        collectedAt: this.remoteCollectedAt.get(election) ?? new Date(now).toISOString(),
        parserVersion: "1.0.0",
        status: parsed.finished ? "finalizado" : "ao_vivo",
        sourceAgeSeconds: Math.max(0, Math.round((now - Date.parse(parsed.generatedAt)) / 1000)),
        collectedAgeSeconds: Math.max(
          0,
          Math.round(
            (now -
              Date.parse(this.remoteCollectedAt.get(election) ?? new Date(now).toISOString())) /
              1000,
          ),
        ),
        snapshotAgeSeconds: 0,
      }
    }
    const stale = this.scenario === "erro-fonte" || this.scenario === "offline"
    return {
      nome: "Tribunal Superior Eleitoral",
      url: "local://fixtures",
      generationId: generation,
      generatedAt: new Date(now).toISOString(),
      collectedAt: new Date(stale ? now - 120_000 : now).toISOString(),
      parserVersion: "1.0.0",
      status: stale ? "desatualizado" : this.finished() ? "finalizado" : "ao_vivo",
      sourceAgeSeconds: stale ? 120 : 0,
      collectedAgeSeconds: stale ? 120 : 0,
      snapshotAgeSeconds: 0,
    }
  }

  private apuracao(parsed: ParsedScope | null): Apuracao {
    if (this.mode === "real") {
      return {
        secoesTotalizadas: parsed?.sections.counted ?? 0,
        secoesTotal: parsed?.sections.total ?? 0,
        percentual: Math.max(0, Math.min(100, parsed?.progress ?? 0)),
        finalizada: Boolean(parsed?.finished),
      }
    }
    const progress = parsed ? this.progress() : 0
    return {
      secoesTotalizadas: Math.round((parsed?.sections.counted ?? 0) * (progress / 100)),
      secoesTotal: parsed?.sections.total ?? 0,
      percentual: progress,
      finalizada: this.finished() && progress >= 100,
    }
  }

  private resumo(parsed: ParsedScope | null): Resumo {
    const progress = parsed ? this.progress() / 100 : 0
    return {
      votosValidos: round((parsed?.votes.valid ?? 0) * progress),
      brancos: round((parsed?.votes.blank ?? 0) * progress),
      nulos: round((parsed?.votes.null ?? 0) * progress),
      comparecimento: round((parsed?.electorate.turnout ?? 0) * progress),
      abstencao: round((parsed?.electorate.abstention ?? 0) * (1 - progress)),
      eleitorado: parsed?.electorate.total ?? 0,
      basePercentual: "validos",
    }
  }

  private office(parsed: ParsedScope | null, code: string): ParsedOffice | null {
    if (!parsed) return null
    return parsed.offices.find((entry) => entry.office.id === code) ?? null
  }

  private candidates(parsed: ParsedScope | null, code: string): Candidate[] {
    const office = this.office(parsed, code)
    if (!office) return []
    const progress = this.progress() / 100
    const valid = round(office.validVotes * progress)
    return office.candidates
      .filter(
        (candidate) =>
          !(this.scenario === "candidato-removido" && candidate.id === office.candidates[0]?.id),
      )
      .map((candidate) => {
        let factor = progress
        if (this.scenario === "virada" && code === PRESIDENT) {
          factor = Math.pow(progress, candidate === office.candidates[0] ? 1 : 0.7)
        }
        if (this.scenario === "empate") factor = progress
        const votes = round(candidate.votos * factor)
        return {
          ...candidate,
          votos: votes,
          percentual: computeShare(votes, valid),
          percentualBase: "calculado_validos" as const,
          calculado: true,
        }
      })
  }

  private officeInfo(parsed: ParsedScope | null, code: string): Office {
    const office = this.office(parsed, code)
    if (office) return office.office
    const names: Record<string, string> = {
      "1": "Presidente",
      "3": "Governador",
      "5": "Senador",
      "6": "Deputado Federal",
      "7": "Deputado Estadual",
      "8": "Deputado Distrital",
    }
    return {
      id: code,
      nome: names[code] ?? `Cargo ${code}`,
      tipo: ["6", "7", "8", "13"].includes(code) ? "proporcional" : "majoritario",
    }
  }

  private parsedFor(uf: string, code: string, election = FIRST_ELECTION): ParsedScope | null {
    const remote = this.remoteByUf.get(election)?.get(uf)
    if (remote) return remote
    if (election === SECOND_ELECTION) return null
    return this.byUf.get(uf)?.get(code) ?? null
  }

  private nationalFor(election: string): ParsedScope | null {
    return (
      this.remoteNational.get(election) ??
      (election === SECOND_ELECTION ? this.secondTurnPresident : this.nationalPresident)
    )
  }

  private dataElection(election: string, code: string): string {
    if (code === PRESIDENT) return election
    if (election === FIRST_ELECTION) return "6259"
    if (election === SECOND_ELECTION) return "6260"
    return election
  }

  async refresh(election: string): Promise<void> {
    if (!this.repository) return
    const refreshedAt = this.remoteRefreshedAt.get(election)
    if (refreshedAt && this.now() - refreshedAt < 3_000) return
    const inflight = this.remoteRefreshInflight.get(election)
    if (inflight) return inflight
    const task = this.refreshRemote(election)
    this.remoteRefreshInflight.set(election, task)
    await task
    this.remoteRefreshInflight.delete(election)
  }

  private async refreshRemote(election: string): Promise<void> {
    const repository = this.repository
    if (!repository) return
    const byUf = this.remoteByUf.get(election) ?? new Map<string, ParsedScope>()
    const scopes = ["br", ...UF_CODES.map(([uf]) => uf)]
    const results = await Promise.allSettled(
      scopes.map(async (scope) => ({
        scope,
        current: await repository.getCurrent({
          ciclo: "ele2026",
          pleito: election,
          escopo: scope.toLowerCase(),
          cargo: PRESIDENT,
        }),
      })),
    )
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.current) continue
      const { scope, current } = result.value
      try {
        const parsed = parseResult(current.body as never)
        if (scope === "br") {
          this.remoteNational.set(election, parsed)
          this.remoteCollectedAt.set(election, current.pointer.collectedAt)
        } else {
          byUf.set(scope.toUpperCase(), parsed)
        }
      } catch {
        // Um arquivo inválido não pode congelar os outros 27 escopos.
      }
    }
    this.remoteByUf.set(election, byUf)
    this.remoteRefreshedAt.set(election, this.now())
  }

  private electionMeta(election: string): { pleitoId: string; name: string; turn: number } | null {
    for (const pleito of this.catalog.pleitos) {
      const found = pleito.elections.find((entry) => entry.id === election)
      if (found) return { pleitoId: pleito.id, name: pleito.name, turn: found.turno }
    }
    return null
  }

  private color(party: string): PartyColor {
    return resolvePartyColor(party, this.partyTable)
  }

  panorama(cargoId = PRESIDENT, election = SECOND_ELECTION): Panorama {
    const code = cargoId || PRESIDENT
    const featured = PRESIDENT
    const parsedFor = (uf: string) => this.parsedFor(uf, featured, election)
    const national = this.nationalFor(election)
    const metadata = this.electionMeta(election)
    const progress = this.progress()
    const states: StateSummary[] = UF_CODES.map(([uf, ibge]) => {
      const parsed = parsedFor(uf)
      const office = this.office(parsed, featured)
      const candidates = this.candidates(parsed, featured)
      const valid = round((office?.validVotes ?? 0) * (progress / 100))
      const leaderResult = pickLeader(candidates)
      const tie = progress > 0 && leaderResult.tie.length > 1
      const incoming = progress > 0 && !tie ? leaderResult.candidate : null
      const key = `${uf}:${featured}`
      const previous = this.leaderState.get(key)
      const stable = nextLeader(
        previous?.leader ?? null,
        incoming ? { id: incoming.id, votos: incoming.votos } : null,
        valid,
        previous?.streak ?? 0,
        this.now(),
        previous?.lastAt ?? 0,
      )
      this.leaderState.set(key, {
        leader: stable.leader,
        streak: stable.streak,
        lastAt: stable.lastAt,
      })
      const leader = stable.leader
        ? (candidates.find((candidate) => candidate.id === stable.leader?.id) ?? null)
        : null
      const status = resolveStatus({
        hasFile: parsed !== null && office !== null,
        applies: true,
        validVotes: valid,
        hasEligibleLeader: leader !== null,
      })
      const color = leader && !tie ? this.color(leader.partido) : null
      const absent = status === "sem_dado" || status === "nao_aplicavel"
      const stateProgress =
        this.mode === "real" ? Math.max(0, Math.min(100, parsed?.progress ?? 0)) : progress
      return {
        uf,
        nome: UF_NAMES[uf] ?? uf,
        ibge,
        cor: color,
        lider: leader
          ? {
              candidatoId: leader.id,
              nome: leader.nomeUrna,
              partido: leader.partido,
              votos: leader.votos,
              percentual: computeShare(leader.votos, valid),
            }
          : null,
        votosValidos: absent ? null : valid,
        percentualApurado: absent ? null : stateProgress,
        status,
        origem: null,
        disputaAcirrada: stable.acirrada,
        empate: tie,
      }
    })

    return {
      apiVersion: "1",
      modo: this.mode,
      eleicao: election,
      versao: `${election}:${code}:${national?.generationId ?? "sem"}:${this.catalog.version}:${progress}`,
      catalogVersion: this.catalog.version,
      geradoEm: new Date(this.now()).toISOString(),
      fonte: this.source(national, "br", `${this.scenario}:${progress}`, election),
      pleito: {
        id: metadata?.pleitoId ?? "3220",
        nome:
          code === GOVERNOR ? "Eleições Gerais 2026 — Estadual" : "Eleições Gerais 2026 — Federal",
        turno: metadata?.turn ?? 1,
      },
      cargoEmDestaque: this.officeInfo(national, PRESIDENT),
      cargoSelecionado: this.officeInfo(national, code),
      apuracao: this.apuracao(national),
      resumo: this.resumo(national),
      candidatos: orderCandidates(this.candidates(national, PRESIDENT)).map((candidate) => ({
        id: candidate.id,
        nomeUrna: candidate.nomeUrna,
        partido: candidate.partido,
        votos: candidate.votos,
        percentual: candidate.percentual,
        cor: this.color(candidate.partido).hex,
      })),
      estados: states,
    }
  }

  async scopeSnapshot(
    uf: string,
    cargoId = PRESIDENT,
    election = SECOND_ELECTION,
  ): Promise<ScopeSnapshot> {
    const code = cargoId || PRESIDENT
    const parsed = this.parsedFor(uf, code, election)
    const office = this.office(parsed, code)
    const candidates = this.candidates(parsed, code)
    const progress = this.progress()
    const valid = round((office?.validVotes ?? 0) * (progress / 100))
    const leader = pickLeader(candidates).candidate
    const status = resolveStatus({
      hasFile: parsed !== null && office !== null,
      applies: parsed !== null || this.cargos(uf).some((cargo) => cargo.id === code),
      validVotes: valid,
      hasEligibleLeader: leader !== null,
    })
    const snapshot = this.snapshotEnvelope(
      {
        tipo: "uf",
        id: uf.toLowerCase(),
        nome: UF_NAMES[uf] ?? uf,
        uf,
        ibge: UF_CODES.find(([sigla]) => sigla === uf)?.[1],
      },
      code,
      parsed,
      candidates,
      status,
      election,
    )
    const cities = this.municipalities.ufs[uf] ?? []
    const totalMunicipalities = cities.length
    if (snapshot.dados && this.mode === "real") {
      const rowsKey = `${election}:${uf}:${code}`
      const rows = this.municipalityRows.get(rowsKey) ?? new Map()
      const loaded = this.municipalityLoaded.get(rowsKey) ?? new Set<number>()
      this.municipalityRows.set(rowsKey, rows)
      this.municipalityLoaded.set(rowsKey, loaded)
      snapshot.dados.municipios = cities.map(
        (city) =>
          rows.get(city.ibge) ?? {
            ibge: city.ibge,
            nome: city.nome,
            uf,
            cor: null,
            lider: null,
            percentual: null,
          },
      )
      snapshot.municipiosCarregados = loaded.size
      snapshot.municipiosTotal = totalMunicipalities
      snapshot.municipiosCarregando = loaded.size < totalMunicipalities
      snapshot.municipiosAtualizadosEm = this.oldestMunicipalityTime(rowsKey)
      snapshot.versao = `${snapshot.versao}:${loaded.size}:${this.municipalityVersion.get(rowsKey) ?? 0}`
      const complete = loaded.size >= totalMunicipalities
      if (!complete || this.isLiveElection(election)) {
        this.maybeSweepMunicipalities(uf, code, this.dataElection(election, code), election)
      }
    } else if (snapshot.dados) {
      const hasCompleteLocalCities =
        cities.length > 0 &&
        cities.every((city) =>
          Boolean(
            this.tryLoad(
              `2026/${election}/${uf.toLowerCase()}${city.tse}-c000${code}-e00${election}-u.json`,
            ),
          ),
        )
      if (hasCompleteLocalCities) {
        snapshot.dados.municipios = await this.localMunicipalityRows(
          uf,
          code,
          this.dataElection(election, code),
        )
      } else {
        snapshot.dados.municipios = cities.map((city) => {
          const cityCandidates = this.cityCandidates(parsed, code, city.ibge)
          const cityLeader = pickLeader(cityCandidates).candidate
          const cityValid = cityCandidates.reduce((total, candidate) => total + candidate.votos, 0)
          return {
            ibge: city.ibge,
            nome: city.nome,
            uf,
            cor: cityLeader ? this.color(cityLeader.partido) : null,
            lider: cityLeader
              ? {
                  candidatoId: cityLeader.id,
                  nome: cityLeader.nomeUrna,
                  partido: cityLeader.partido,
                  votos: cityLeader.votos,
                }
              : null,
            percentual: cityLeader ? computeShare(cityLeader.votos, cityValid) : null,
          }
        })
      }
      snapshot.municipiosCarregados = totalMunicipalities
      snapshot.municipiosTotal = totalMunicipalities
      snapshot.municipiosCarregando = false
    }
    return snapshot
  }

  private oldestMunicipalityTime(key: string): string | undefined {
    const times = this.municipalityTimes.get(key)
    if (!times || times.size === 0) return undefined
    let oldest: string | undefined
    for (const time of times.values()) {
      if (!oldest || Date.parse(time) < Date.parse(oldest)) oldest = time
    }
    return oldest
  }

  private maybeSweepMunicipalities(
    uf: string,
    code: string,
    dataElection: string,
    displayElection: string,
  ): void {
    const key = `${displayElection}:${uf}:${code}`
    if (this.municipalitySweepInflight.has(key)) return
    const last = this.municipalitySweepAt.get(key) ?? 0
    if (this.now() - last < MUNICIPAL_REFRESH_MS) return
    const task = this.sweepMunicipalities(uf, code, dataElection, displayElection).finally(() => {
      this.municipalitySweepInflight.delete(key)
      this.municipalitySweepAt.set(key, this.now())
    })
    this.municipalitySweepInflight.set(key, task)
  }

  /**
   * Monta/atualiza as linhas municipais a partir do cache compartilhado.
   * Só consulta o TSE quando o município ainda não existe em lugar nenhum,
   * e nesse caso apenas uma instância detém o lease daquele estado.
   */
  private async sweepMunicipalities(
    uf: string,
    code: string,
    dataElection: string,
    displayElection: string,
  ): Promise<void> {
    const key = `${displayElection}:${uf}:${code}`
    const cities = this.municipalities.ufs[uf] ?? []
    const rows = this.municipalityRows.get(key) ?? new Map()
    const loaded = this.municipalityLoaded.get(key) ?? new Set<number>()
    const times = this.municipalityTimes.get(key) ?? new Map<number, string>()
    this.municipalityRows.set(key, rows)
    this.municipalityLoaded.set(key, loaded)
    this.municipalityTimes.set(key, times)
    let lease = true
    const acquire = this.repository?.acquireLease
    if (acquire) {
      lease = await acquire
        .call(this.repository, `municipios:${key}`, 5 * 60_000)
        .catch(() => false)
    }
    try {
      for (let index = 0; index < cities.length; index += MUNICIPAL_BATCH) {
        const batch = cities.slice(index, index + MUNICIPAL_BATCH)
        await Promise.all(
          batch.map(async (city) => {
            const parsed = await this.loadCity(uf, city.tse, code, dataElection, true, lease)
            if (!parsed) return
            const row = this.municipalityRow(uf, city, code, parsed)
            if (!row) return
            const previous = rows.get(city.ibge)
            rows.set(city.ibge, row)
            loaded.add(city.ibge)
            times.set(
              city.ibge,
              this.cityCollectedAt.get(`${dataElection}:${uf}:${city.tse}:${code}`) ??
                new Date(this.now()).toISOString(),
            )
            if (JSON.stringify(previous) !== JSON.stringify(row)) {
              this.municipalityVersion.set(key, (this.municipalityVersion.get(key) ?? 0) + 1)
            }
          }),
        )
      }
    } finally {
      this.municipalitySweepAt.set(key, this.now())
    }
  }

  private municipalityRow(
    uf: string,
    city: { ibge: number; nome: string },
    code: string,
    parsed: ParsedScope,
  ): MunicipalityRow | null {
    const office = this.office(parsed, code)
    if (!office) return null
    const candidates = this.candidates(parsed, code)
    const leader = pickLeader(candidates).candidate
    return {
      ibge: city.ibge,
      nome: city.nome,
      uf,
      cor: leader ? this.color(leader.partido) : null,
      lider: leader
        ? {
            candidatoId: leader.id,
            nome: leader.nomeUrna,
            partido: leader.partido,
            votos: leader.votos,
          }
        : null,
      percentual: leader ? computeShare(leader.votos, office.validVotes) : null,
    }
  }

  private updateMunicipalityRow(
    uf: string,
    city: { ibge: number; nome: string; tse: string },
    code: string,
    displayElection: string,
    dataElection: string,
    parsed: ParsedScope,
  ): void {
    const row = this.municipalityRow(uf, city, code, parsed)
    if (!row) return
    const key = `${displayElection}:${uf}:${code}`
    const rows = this.municipalityRows.get(key) ?? new Map()
    const loaded = this.municipalityLoaded.get(key) ?? new Set<number>()
    const times = this.municipalityTimes.get(key) ?? new Map<number, string>()
    const previous = rows.get(city.ibge)
    rows.set(city.ibge, row)
    loaded.add(city.ibge)
    times.set(
      city.ibge,
      this.cityCollectedAt.get(`${dataElection}:${uf}:${city.tse}:${code}`) ??
        new Date(this.now()).toISOString(),
    )
    this.municipalityRows.set(key, rows)
    this.municipalityLoaded.set(key, loaded)
    this.municipalityTimes.set(key, times)
    if (JSON.stringify(previous) !== JSON.stringify(row)) {
      this.municipalityVersion.set(key, (this.municipalityVersion.get(key) ?? 0) + 1)
    }
  }

  private async localMunicipalityRows(
    uf: string,
    code: string,
    election: string,
  ): Promise<NonNullable<ScopeSnapshot["dados"]>["municipios"]> {
    const cities = this.municipalities.ufs[uf] ?? []
    const rows: NonNullable<ScopeSnapshot["dados"]>["municipios"] = []
    for (const city of cities) {
      const parsed = await this.loadCity(uf, city.tse, code, election, true)
      const row = parsed ? this.municipalityRow(uf, city, code, parsed) : null
      if (row) rows.push(row)
    }
    return rows
  }

  cityCandidates(parsed: ParsedScope | null, code: string, ibge: number): Candidate[] {
    if (!parsed) return []
    const base = this.office(parsed, code)
    if (!base) return []
    const progress = this.progress() / 100
    const factor = (0.4 + (hashNumber(String(ibge)) % 1000) / 1000) / 18
    const candidates = base.candidates.map((candidate) => {
      const skew = 0.55 + (hashNumber(`${candidate.partido}#${ibge}`) % 900) / 1000
      return {
        ...candidate,
        votos: round(candidate.votos * factor * progress * skew),
      }
    })
    const valid = candidates.reduce((total, candidate) => total + candidate.votos, 0)
    return candidates.map((candidate) => ({
      ...candidate,
      percentual: computeShare(candidate.votos, valid),
      percentualBase: "calculado_validos" as const,
      calculado: true,
    }))
  }

  async municipality(
    ibge: number,
    cargoId = PRESIDENT,
    election = SECOND_ELECTION,
  ): Promise<ScopeSnapshot | null> {
    const code = cargoId || PRESIDENT
    const dataElection = this.dataElection(election, code)
    const ufEntry = Object.entries(this.municipalities.ufs).find(([, cities]) =>
      cities.some((city) => city.ibge === ibge),
    )
    if (!ufEntry) return null
    const [uf, cities] = ufEntry
    const city = cities.find((entry) => entry.ibge === ibge)
    if (!city) return null
    const escopo = {
      tipo: "municipio" as const,
      id: city.tse,
      nome: city.nome,
      uf,
      ibge: city.ibge,
    }
    if (this.mode === "real") {
      const cityParsed = await this.loadCity(uf, city.tse, code, dataElection)
      if (!cityParsed) return this.snapshotEnvelope(escopo, code, null, [], "sem_dado", election)
      const cityCandidates = this.candidates(cityParsed, code)
      const cityOffice = this.office(cityParsed, code)
      const cityValid = round((cityOffice?.validVotes ?? 0) * (this.progress() / 100))
      const cityLeader = pickLeader(cityCandidates).candidate
      const cityStatus = resolveStatus({
        hasFile: cityOffice !== null,
        applies: true,
        validVotes: cityValid,
        hasEligibleLeader: cityLeader !== null,
      })
      this.updateMunicipalityRow(uf, city, code, election, dataElection, cityParsed)
      return this.snapshotEnvelope(escopo, code, cityParsed, cityCandidates, cityStatus, election)
    }
    const parsed = this.parsedFor(uf, code, election)
    const candidates = this.cityCandidates(parsed, code, ibge)
    const base = this.office(parsed, code)
    const valid = candidates.reduce((total, candidate) => total + candidate.votos, 0)
    const leader = pickLeader(candidates).candidate
    const status = resolveStatus({
      hasFile: parsed !== null && base !== null,
      applies: parsed !== null || this.cargos(uf).some((cargo) => cargo.id === code),
      validVotes: valid,
      hasEligibleLeader: leader !== null,
    })
    const snapshot = this.snapshotEnvelope(escopo, code, parsed, candidates, status, election)
    if (snapshot.dados) {
      snapshot.dados.resumo.votosValidos = valid
      const ufValid = round((base?.validVotes ?? 0) * (this.progress() / 100))
      const ratio = ufValid > 0 ? valid / ufValid : 0
      const eleitorado = round((parsed?.electorate.total ?? 0) * ratio)
      snapshot.dados.resumo.eleitorado = eleitorado
      snapshot.dados.resumo.comparecimento = round((parsed?.electorate.turnout ?? 0) * ratio)
      snapshot.dados.resumo.abstencao = Math.max(
        0,
        eleitorado - snapshot.dados.resumo.comparecimento,
      )
    }
    return snapshot
  }

  private snapshotEnvelope(
    escopo: ScopeSnapshot["escopo"],
    code: string,
    parsed: ParsedScope | null,
    candidates: Candidate[],
    status: ScopeSnapshot["status"],
    election = FIRST_ELECTION,
  ): ScopeSnapshot {
    const progress = this.progress()
    const office = this.office(parsed, code)
    const valid = round((office?.validVotes ?? 0) * (progress / 100))
    return {
      apiVersion: "1",
      eleicao: election,
      modo: this.mode,
      versao: `${election}:${escopo.id}:${code}:${parsed?.generationId ?? "sem"}:${this.catalog.version}:${progress}`,
      catalogVersion: this.catalog.version,
      status,
      retificado: this.scenario === "retificacao",
      geradoEm: new Date(this.now()).toISOString(),
      fonte: this.source(
        parsed,
        escopo.uf?.toLowerCase() ?? "br",
        `${this.scenario}:${progress}`,
        parsed?.electionId ?? election,
      ),
      escopo,
      cargo: this.officeInfo(parsed, code),
      origem: null,
      dados:
        status === "sem_dado" || status === "nao_aplicavel"
          ? null
          : {
              apuracao: this.apuracao(parsed),
              resumo: {
                votosValidos: valid,
                brancos: round((office?.blank ?? 0) * (progress / 100)),
                nulos: round((office?.nullVotes ?? 0) * (progress / 100)),
                comparecimento: round((parsed?.electorate.turnout ?? 0) * (progress / 100)),
                abstencao: round((parsed?.electorate.abstention ?? 0) * (1 - progress / 100)),
                eleitorado: parsed?.electorate.total ?? 0,
                basePercentual: "validos",
              },
              candidatos: orderCandidates(candidates),
            },
    }
  }

  race(election = SECOND_ELECTION): Race {
    const parsed = this.nationalFor(election)
    const metadata = this.electionMeta(election)
    const candidates = this.candidates(parsed, PRESIDENT)
    const eligible = orderCandidates(candidates.filter((candidate) => isEligible(candidate)))
    const leader = eligible[0] ?? null
    const second = eligible[1] ?? null
    const validVotes = round(
      (this.office(parsed, PRESIDENT)?.validVotes ?? 0) * (this.progress() / 100),
    )
    const position = racePositions({
      progress: this.progress(),
      votesA: leader?.votos ?? 0,
      votesB: second?.votos ?? 0,
      validVotes,
    })
    const horses =
      this.progress() === 0 || validVotes === 0 || !parsed
        ? []
        : [leader, second].filter((candidate): candidate is Candidate => candidate !== null)
    return {
      apiVersion: "1",
      modo: this.mode,
      versao: `${election}:1:${parsed?.generationId ?? "sem"}:${this.catalog.version}:${this.progress()}`,
      cargo: { ...this.officeInfo(parsed, PRESIDENT), escopo: "br" },
      pleito: { id: election, turno: metadata?.turn ?? 1 },
      apuracao: this.apuracao(parsed),
      cavalos: horses.map((candidate, index) => ({
        posicao: index + 1,
        candidatoId: candidate.id,
        nomeUrna: candidate.nomeUrna,
        partido: candidate.partido,
        cor: this.color(candidate.partido).hex,
        votos: candidate.votos,
        percentual: candidate.percentual,
      })),
      diferenca: {
        votos: Math.abs((leader?.votos ?? 0) - (second?.votos ?? 0)),
        normalizada: Number(position.g.toFixed(4)),
        lider: leader?.id ?? null,
      },
      ultimaUltrapassagem: null,
      interesses:
        this.progress() === 0 || validVotes === 0 || (this.mode === "real" && !parsed)
          ? "sem_voto"
          : this.mode === "real"
            ? parsed?.finished
              ? "finalizado"
              : "ao_vivo"
            : this.finished()
              ? "finalizado"
              : "ao_vivo",
    }
  }

  pleitos(): Pleito[] {
    const progress = this.progress()
    return this.catalog.pleitos
      .filter((pleito) => pleito.id === "3220" || pleito.id === "3221")
      .map((pleito) => ({
        id: pleito.id,
        nome: pleito.name,
        data: pleito.date,
        estado:
          pleito.id === "3221" ? "nao_iniciada" : this.finished() ? "finalizado" : "em_apuracao",
        cargos: pleito.elections.flatMap((election) => election.offices),
        turnos: pleito.elections.map((election) => ({
          eleicao: election.id,
          turno: election.turno,
          nome: election.name,
          percentualApurado: pleito.id === "3221" ? 0 : progress,
        })),
      }))
  }

  localidades(query: string) {
    const items = [
      ...UF_CODES.map(([uf]) => ({
        tipo: "estado" as const,
        nome: UF_NAMES[uf] ?? uf,
        uf,
        slug: uf.toLowerCase(),
      })),
      ...Object.entries(this.municipalities.ufs).flatMap(([uf, cities]) =>
        cities.map((city) => ({
          tipo: "municipio" as const,
          nome: city.nome,
          uf,
          slug: city.nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          ibge: city.ibge,
          capital: city.capital,
        })),
      ),
    ]
    const term = query
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
    if (term.length < 2) return []
    return items
      .filter((item) => {
        const name = item.nome
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
        return name.startsWith(term) || name.includes(term) || item.uf.toLowerCase() === term
      })
      .sort((a, b) => {
        const aExact = a.nome.toLowerCase() === query.toLowerCase() ? 0 : 1
        const bExact = b.nome.toLowerCase() === query.toLowerCase() ? 0 : 1
        if (aExact !== bExact) return aExact - bExact
        if (a.tipo !== b.tipo) return a.tipo === "estado" ? -1 : 1
        return a.nome.localeCompare(b.nome, "pt-BR")
      })
      .slice(0, 10)
  }

  hasUf(uf: string): boolean {
    return UF_CODES.some(([sigla]) => sigla === uf)
  }

  hasPleito(id: string): boolean {
    return this.catalog.pleitos.some((pleito) => pleito.id === id) || this.electionMeta(id) !== null
  }

  defaultElection(): string {
    return this.mode === "fake" ? FIRST_ELECTION : SECOND_ELECTION
  }

  hasCargo(id: string): boolean {
    return this.catalog.pleitos.some((pleito) =>
      pleito.elections.some((election) => election.offices.some((office) => office.id === id)),
    )
  }

  cargos(uf?: string, election = FIRST_ELECTION): Office[] {
    if (election === SECOND_ELECTION) {
      return [{ ...this.officeInfo(this.nationalFor(election), PRESIDENT), destaque: true }]
    }
    const parsed = uf ? this.byUf.get(uf) : undefined
    const codes = uf === "DF" ? ["1", "3", "5", "6", "8"] : ["1", "3", "5", "6", "7"]
    return codes.map((code) => {
      const office = this.officeInfo(parsed?.get(code) ?? this.nationalPresident, code)
      return { ...office, destaque: code === PRESIDENT }
    })
  }

  /** Usado pela corrida no cliente para histerese. */
  nextLeaderState(
    previous: { id: string; votos: number } | null,
    incoming: { id: string; votos: number } | null,
    valid: number,
    streak: number,
  ) {
    return nextLeader(previous, incoming, valid, streak)
  }
}
