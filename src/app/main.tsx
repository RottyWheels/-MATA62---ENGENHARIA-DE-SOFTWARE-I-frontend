import '../index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { refreshCsrf } from '@/features/auth'

import { Providers } from './providers'
import { router } from './router'

async function enableMocks() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

async function bootstrap() {
  await enableMocks()
  // O cookie XSRF-TOKEN precisa existir antes do primeiro POST.
  await refreshCsrf()

  const root = document.getElementById('root')
  if (!root) throw new Error('Elemento #root não encontrado')

  createRoot(root).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  )
}

void bootstrap()
