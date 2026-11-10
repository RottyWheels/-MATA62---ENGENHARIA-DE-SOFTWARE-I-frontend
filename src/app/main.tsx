import '../index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { toast } from 'sonner'

import { refreshCsrf } from '@/features/auth'

import { Providers } from './providers'
import { router } from './router'

/** Liga o MSW em dev. Retorna `false` se os mocks deveriam ligar e falharam. */
async function enableMocks(): Promise<boolean> {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS !== 'true') return true
  try {
    const { worker } = await import('@/mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
    return true
  } catch (error) {
    // Sem isso, uma falha do Service Worker deixava a página em branco.
    console.error('[Veridt] Não foi possível iniciar os mocks (MSW).', error)
    return false
  }
}

async function bootstrap() {
  const mocksOk = await enableMocks()
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

  if (!mocksOk) {
    toast.error('Mocks desligados', {
      id: 'msw-falhou',
      duration: Infinity,
      description:
        'O Service Worker do MSW não pôde ser registrado; as chamadas vão para o backend. Veja o console do navegador.',
    })
  }
}

void bootstrap()
