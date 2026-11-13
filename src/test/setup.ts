import '@testing-library/jest-dom/vitest'

import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { resetMockState } from '@/mocks/handlers'
import { server } from '@/mocks/server'
import { queryClient } from '@/shared/api/query-client'

// findBy*/waitFor esperam até 3 s (padrão: 1 s). Com todos os arquivos em
// paralelo, respostas dos mocks com `delay()` às vezes passam de 1 s.
configure({ asyncUtilTimeout: 3_000 })

// APIs do navegador que o jsdom não implementa e que os componentes Radix usam.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
// Estado novo a cada teste: os mocks usam a hora atual (ex.: registro "processando"
// que conclui sozinho), e o primeiro teste de um arquivo pode começar bem depois do import.
beforeEach(() => resetMockState())
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetMockState()
  queryClient.clear()
})
afterAll(() => server.close())
