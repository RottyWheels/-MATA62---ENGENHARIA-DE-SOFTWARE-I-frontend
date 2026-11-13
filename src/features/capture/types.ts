/**
 * Protocolo do WebSocket `/ws/capture/{sessionId}` — PROVISÓRIO,
 * a confirmar com o backend (README, pendências com o backend, item 5).
 */

/**
 * Estado da sessão de captura:
 * - `LOADING`: o navegador remoto está abrindo o site;
 * - `READY`: o site abriu; dá para capturar telas ou começar a gravar;
 * - `RECORDING`: gravando o vídeo da navegação;
 * - `LOAD_FAILED`: o site não abriu (nenhum crédito usado);
 * - `FINISHED`: concluída; virou um registro em processamento;
 * - `FAILED`: falhou depois de aberta (nenhum crédito usado);
 * - `CANCELED`: cancelada pelo usuário (nenhum crédito usado).
 */
export const CAPTURE_STATUSES = [
  'LOADING',
  'READY',
  'RECORDING',
  'LOAD_FAILED',
  'FINISHED',
  'FAILED',
  'CANCELED',
] as const

export type CaptureStatus = (typeof CAPTURE_STATUSES)[number]

/** Estados em que a sessão terminou e o socket não reconecta. */
export const FINAL_CAPTURE_STATUSES: readonly CaptureStatus[] = [
  'LOAD_FAILED',
  'FINISHED',
  'FAILED',
  'CANCELED',
]

export const isFinalCaptureStatus = (status: CaptureStatus | null | undefined) =>
  !!status && FINAL_CAPTURE_STATUSES.includes(status)

/** Mensagens do servidor para o navegador. */
export type ServerMessage =
  /** Quadro do navegador remoto: JPEG em base64 (sem o prefixo `data:`). */
  | { type: 'frame'; data: string; width: number; height: number }
  | { type: 'status'; status: CaptureStatus }

/** Eventos do usuário enviados ao navegador remoto. Coordenadas no viewport remoto. */
export type ClientMessage =
  | { type: 'mouse'; action: 'down' | 'up' | 'move'; x: number; y: number; button?: number }
  | { type: 'wheel'; deltaX: number; deltaY: number }
  | { type: 'key'; action: 'down' | 'up'; key: string; code: string }
  | { type: 'navigate'; url: string }
  | { type: 'screenshot' }
  | { type: 'finish' }

export type SocketStatus = 'connecting' | 'open' | 'closed' | 'error'

export type CaptureFrame = Extract<ServerMessage, { type: 'frame' }>

export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== 'string') return null
  try {
    const msg: unknown = JSON.parse(raw)
    if (typeof msg !== 'object' || msg === null || !('type' in msg)) return null
    const m = msg as Record<string, unknown>
    if (
      m.type === 'frame' &&
      typeof m.data === 'string' &&
      typeof m.width === 'number' &&
      typeof m.height === 'number'
    ) {
      return { type: 'frame', data: m.data, width: m.width, height: m.height }
    }
    if (
      m.type === 'status' &&
      typeof m.status === 'string' &&
      (CAPTURE_STATUSES as readonly string[]).includes(m.status)
    ) {
      return { type: 'status', status: m.status as CaptureStatus }
    }
    return null
  } catch {
    return null
  }
}
