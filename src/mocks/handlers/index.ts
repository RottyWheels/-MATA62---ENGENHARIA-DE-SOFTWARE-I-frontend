import type { AnyHandler } from 'msw'

import { authHandlers, resetAuthMock } from './auth'
import { captureHandlers, resetCaptureMock } from './capture'
import { creditsHandlers, resetCreditsMock } from './credits'
import { recordsHandlers, resetRecordsMock } from './records'

/**
 * Handlers MSW compartilhados pelo navegador (dev com VITE_ENABLE_MOCKS=true)
 * e pelos testes do Vitest. Um arquivo por feature nesta pasta.
 */
export const handlers: AnyHandler[] = [
  ...authHandlers,
  ...creditsHandlers,
  ...recordsHandlers,
  ...captureHandlers,
]

/** Restaura o estado em memória de todos os mocks. */
export function resetMockState() {
  resetAuthMock()
  resetCreditsMock()
  resetRecordsMock()
  resetCaptureMock()
}
