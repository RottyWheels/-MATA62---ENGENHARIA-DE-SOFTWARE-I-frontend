import '../index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { Providers } from './providers'

async function enableMocks() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

async function bootstrap() {
  await enableMocks()

  const root = document.getElementById('root')
  if (!root) throw new Error('Elemento #root não encontrado')

  createRoot(root).render(
    <StrictMode>
      <Providers>
        <App />
      </Providers>
    </StrictMode>,
  )
}

void bootstrap()
