import { createBrowserRouter } from 'react-router'

import { setUnauthorizedHandler } from '@/shared/api/http'

import { routes } from './routes'

export const router = createBrowserRouter(routes)

// Sessão expirada em qualquer chamada → login, sem recarregar a página.
setUnauthorizedHandler((to) => void router.navigate(to, { replace: true }))
