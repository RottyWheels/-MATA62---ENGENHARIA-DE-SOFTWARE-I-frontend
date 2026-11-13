/** Caminhos da API de captura: contrato PROVISÓRIO, a confirmar com o backend. */
const capture = (id: string) => `/api/captures/${encodeURIComponent(id)}`

export const CAPTURE_ENDPOINTS = {
  price: '/api/captures/price',
  create: '/api/captures',
  detail: capture,
  screenshots: (id: string) => `${capture(id)}/screenshots`,
  recordingStart: (id: string) => `${capture(id)}/recording/start`,
  recordingStop: (id: string) => `${capture(id)}/recording/stop`,
  finish: (id: string) => `${capture(id)}/finish`,
  cancel: (id: string) => `${capture(id)}/cancel`,
} as const
