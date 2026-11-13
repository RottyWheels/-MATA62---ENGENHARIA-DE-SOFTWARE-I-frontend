// API pública da feature de captura (módulo `capture` do backend, REQ 08–11).
// As páginas não são exportadas aqui: o router as carrega sob demanda (lazy).

export type {
  Capture,
  CapturePrice,
  CaptureScreenshot,
  CreateCaptureRequest,
  FinishCaptureResponse,
} from './api/types'
export { CAPTURE_ENDPOINTS } from './api/endpoints'
export type { CaptureStatus, ClientMessage, ServerMessage } from './types'
