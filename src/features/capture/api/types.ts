/**
 * Contrato HTTP da captura (REQ 08 a 11). PROVISÓRIO: o módulo `capture` do
 * backend ainda não existe. O WebSocket da sessão fica em `../types.ts`.
 */

import type { CaptureStatus } from '../types'

export type CapturePrice = {
  /** Créditos descontados por registro concluído. */
  creditsPerRecord: number
}

export type CreateCaptureRequest = {
  title: string
  /** Endereço completo, com `http://` ou `https://`. */
  url: string
}

export type CaptureScreenshot = {
  name: string
  /** ISO 8601 (UTC). */
  capturedAt: string
}

/** Sessão de captura: o navegador remoto aberto num site, antes de virar registro. */
export type Capture = {
  id: string
  title: string
  url: string
  status: CaptureStatus
  /** Créditos que o registro vai custar ao ser concluído. */
  cost: number
  /** ISO 8601 (UTC). */
  startedAt: string
  screenshots: CaptureScreenshot[]
  /** Início da gravação em andamento (ISO 8601), ou `null`. */
  recordingStartedAt: string | null
  /** Vídeos gravados na sessão. */
  recordings: number
  /** Registro criado ao concluir (`POST /finish`). */
  recordId: string | null
}

export type FinishCaptureResponse = {
  /** Número do registro, que fica `PROCESSANDO` até os hashes ficarem prontos. */
  recordId: string
}
