import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { renderRoutes } from '@/test/render'

import { RequireAuth } from './RequireAuth'

function LoginProbe() {
  const location = useLocation()
  return <p>login {location.pathname + location.search}</p>
}

const routes = [
  { path: '/login', element: <LoginProbe /> },
  {
    element: <RequireAuth />,
    children: [{ path: '/registros', element: <p>área logada</p> }],
  },
]

const user = {
  id: '1',
  fullName: 'Ana Souza',
  email: 'ana@x.test',
  type: 'COMUM',
  creditBalance: 3,
}

describe('RequireAuth', () => {
  it('redireciona para /login?redirect=<rota> quando /api/me responde 401', async () => {
    renderRoutes(routes, '/registros?pagina=2')

    expect(
      await screen.findByText('login /login?redirect=%2Fregistros%3Fpagina%3D2'),
    ).toBeInTheDocument()
    expect(screen.queryByText('área logada')).not.toBeInTheDocument()
  })

  it('mostra a rota quando há sessão', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(user)))
    renderRoutes(routes, '/registros')

    expect(await screen.findByText('área logada')).toBeInTheDocument()
  })

  it('não redireciona em erro de rede/servidor; oferece nova tentativa', async () => {
    server.use(http.get('*/api/me', () => new HttpResponse(null, { status: 503 })))
    renderRoutes(routes, '/registros')

    expect(
      await screen.findByText('Não foi possível verificar sua sessão.', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
