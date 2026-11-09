import type { RequestHandler } from 'msw'

/**
 * Handlers MSW compartilhados pelo navegador (dev com VITE_ENABLE_MOCKS=true)
 * e pelos testes do Vitest. Adicione um arquivo por feature nesta pasta
 * (ex.: `auth.ts`) e inclua os handlers aqui.
 */
export const handlers: RequestHandler[] = []
