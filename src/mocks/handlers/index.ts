import type { RequestHandler } from 'msw'

import { authHandlers, resetAuthMock } from './auth'
import { creditsHandlers, resetCreditsMock } from './credits'
import { recordsHandlers, resetRecordsMock } from './records'

/**
 * Handlers MSW compartilhados pelo navegador (dev com VITE_ENABLE_MOCKS=true)
 * e pelos testes do Vitest. Um arquivo por feature nesta pasta.
 */
export const handlers: RequestHandler[] = [...authHandlers, ...creditsHandlers, ...recordsHandlers]

/** Restaura o estado em memória de todos os mocks. */
export function resetMockState() {
  resetAuthMock()
  resetCreditsMock()
  resetRecordsMock()
}
