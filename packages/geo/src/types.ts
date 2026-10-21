/**
 * Tipos públicos da camada geográfica.
 *
 * Este pacote é puro: não lê arquivos, não faz `fetch` e não conhece React.
 * O carregamento de `br.topo.json`, `uf/{id}.topo.json` e `meta.json` fica em
 * `apps/web` (servidos de `/geo/...`).
 */

/** Coordenada geográfica em graus: `[longitude, latitude]` (WGS84). */
export type LonLat = readonly [number, number]

/** Bounding box no formato GeoJSON: `[oeste, sul, leste, norte]`. */
export type BBox = readonly [number, number, number, number]

/** Metadados de uma unidade da federação (gerados por `scripts/geo/build.mjs`). */
export interface StateMeta {
  /** Código IBGE de 2 dígitos, como string: `"11"`, `"35"`. */
  readonly id: string
  /** Sigla oficial: `"RO"`, `"SP"`. */
  readonly sigla: string
  /** Nome oficial: `"Rondônia"`, `"São Paulo"`. */
  readonly nome: string
  /** Centroide geográfico da malha simplificada (não é a capital). */
  readonly centroide: LonLat
  /** Caixa envolvente da malha simplificada. */
  readonly bbox: BBox
  /** Quantidade de municípios presentes em `uf/{id}.topo.json`. */
  readonly municipios?: number
}

/** Origem de uma malha baixada do IBGE, para auditoria e reprodução. */
export interface GeoSource {
  /** `"br"` ou `"uf/{id}"`. */
  readonly escopo: string
  readonly url: string
  /** SHA-256 do corpo bruto do download, com prefixo `sha256:`. */
  readonly hash: string
  readonly bytes: number
}

/** Conteúdo de `data/geo/meta.json`. */
export interface GeoMeta {
  /** Versão derivada do hash das malhas: `1.0.0-<12 hex>`. */
  readonly versao: string
  /** ISO 8601 em UTC do momento da geração. */
  readonly geradoEm: string
  /** 27 estados ordenados por nome. */
  readonly estados: readonly StateMeta[]
  /** 29 downloads (metadados + país + 27 UFs) com URL e hash. */
  readonly fontes?: readonly GeoSource[]
}
