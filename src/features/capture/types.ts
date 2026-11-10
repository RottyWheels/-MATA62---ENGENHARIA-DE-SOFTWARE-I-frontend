/**
 * Protocolo do WebSocket `/ws/capture/{sessionId}` — PROVISÓRIO,
 * a confirmar com o backend (README, pendência 7).
 */

export type CaptureStatus = 'RECORDING' | 'FINISHED' | 'FAILED'

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
      (m.status === 'RECORDING' || m.status === 'FINISHED' || m.status === 'FAILED')
    ) {
      return { type: 'status', status: m.status }
    }
    return null
  } catch {
    return null
  }
}
