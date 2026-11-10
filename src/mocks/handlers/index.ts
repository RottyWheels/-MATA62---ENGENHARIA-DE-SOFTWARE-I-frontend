import type { RequestHandler } from 'msw'

import { authHandlers, resetAuthMock } from './auth'
import { creditsHandlers, resetCreditsMock } from './credits'

/**
 * Handlers MSW compartilhados pelo navegador (dev com VITE_ENABLE_MOCKS=true)
 * e pelos testes do Vitest. Um arquivo por feature nesta pasta.
 */
export const handlers: RequestHandler[] = [...authHandlers, ...creditsHandlers]

/** Restaura o estado em memória de todos os mocks. */
export function resetMockState() {
  resetAuthMock()
  resetCreditsMock()
}
