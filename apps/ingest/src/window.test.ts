import { describe, expect, it } from "vitest"
import { isIngestActive } from "./window"

const ATIVACAO = "2026-10-25T16:55:00-03:00"
const DESATIVACAO = "2026-10-26T00:00:00-03:00"

describe("janela de ingestão", () => {
  it("fica inativa antes das 16:55 de Brasília", () => {
    expect(isIngestActive(new Date("2026-10-25T19:54:59Z"), ATIVACAO, DESATIVACAO)).toBe(false)
  })

  it("ativa exatamente às 16:55 de Brasília", () => {
    expect(isIngestActive(new Date("2026-10-25T19:55:00Z"), ATIVACAO, DESATIVACAO)).toBe(true)
  })

  it("continua ativa até 23:59:59 de Brasília", () => {
    expect(isIngestActive(new Date("2026-10-26T02:59:59Z"), ATIVACAO, DESATIVACAO)).toBe(true)
  })

  it("desativa à meia-noite de 26/10", () => {
    expect(isIngestActive(new Date("2026-10-26T03:00:00Z"), ATIVACAO, DESATIVACAO)).toBe(false)
  })

  it("não reativa em outro ano", () => {
    expect(isIngestActive(new Date("2027-10-25T20:00:00Z"), ATIVACAO, DESATIVACAO)).toBe(false)
  })

  it("rejeita configuração sem fuso válido", () => {
    expect(() => isIngestActive(new Date(), "25/10/2026 16:55", DESATIVACAO)).toThrow(
      /janela de ingestão inválida/,
    )
  })
})
