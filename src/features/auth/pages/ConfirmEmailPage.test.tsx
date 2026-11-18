import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { MOCK_CONFIRMATION_TOKEN, UNCONFIRMED_USER } from '@/mocks/handlers/auth'
import { server } from '@/mocks/server'
import { http as api } from '@/shared/api/http'
import { createQueryClient } from '@/shared/api/query-client'
import { renderRoutes } from '@/test/render'

import { ConfirmEmailPage } from './ConfirmEmailPage'

const routes = [
  { path: '/confirmar-email', element: <ConfirmEmailPage /> },
  { path: '/login', element: <p>tela de login</p> },
]

/** Conta as chamadas de confirmação e guarda os corpos, sem trocar a resposta dos mocks. */
function spyConfirm() {
  const bodies: unknown[] = []
  server.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith('/email-confirmation/confirm')) {
      bodies.push(await request.clone().json())
    }
  })
  return bodies
}

afterEach(() => server.events.removeAllListeners())

describe('ConfirmEmailPage', () => {
  it('confirma com o token do link, uma única vez, e tira o token da URL', async () => {
    const bodies = spyConfirm()
    const { router, user } = renderRoutes(
      routes,
      `/confirmar-email?token=${MOCK_CONFIRMATION_TOKEN}`,
    )

    expect(screen.getByText('Confirmando seu e-mail...')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))

    const result = (await screen.findByText('E-mail confirmado')).closest('[role="status"]')
    expect(result).toHaveFocus()
    expect(bodies).toEqual([{ token: MOCK_CONFIRMATION_TOKEN }])

    await user.click(screen.getByRole('link', { name: 'Ir para o login' }))
    expect(await screen.findByText('tela de login')).toBeInTheDocument()
  })

  it('faz um POST só no StrictMode (montagem dupla)', async () => {
    const bodies = spyConfirm()
    const router = createMemoryRouter(routes, {
      initialEntries: [`/confirmar-email?token=${MOCK_CONFIRMATION_TOKEN}`],
    })
    render(
      <StrictMode>
        <QueryClientProvider client={createQueryClient()}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    )

    expect(await screen.findByText('E-mail confirmado')).toBeInTheDocument()
    expect(bodies).toHaveLength(1)
  })

  it('libera o login da conta depois de confirmar', async () => {
    const login = () =>
      api.post('/auth/login', {
        email: UNCONFIRMED_USER.email,
        password: UNCONFIRMED_USER.password,
      })
    await expect(login()).rejects.toMatchObject({ response: { status: 403 } })

    renderRoutes(routes, `/confirmar-email?token=${MOCK_CONFIRMATION_TOKEN}`)
    expect(await screen.findByText('E-mail confirmado')).toBeInTheDocument()

    await expect(login()).resolves.toMatchObject({ status: 204 })
  })

  it('token inválido, expirado ou usado (422): link inválido, com o reenvio', async () => {
    const { user } = renderRoutes(routes, '/confirmar-email?token=tk-expirado-123')

    const result = await screen.findByRole('alert')
    expect(result).toHaveTextContent('Link inválido ou expirado')
    expect(result).toHaveFocus()
    // O token não aparece em nenhuma mensagem.
    expect(document.body).not.toHaveTextContent('tk-expirado-123')

    await user.type(screen.getByLabelText('E-mail'), UNCONFIRMED_USER.email)
    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))
    expect(
      await screen.findByText(
        /Se houver uma conta pendente com esse e-mail, enviamos um novo link/,
      ),
    ).toBeInTheDocument()
  })

  it('o mesmo link não confirma duas vezes', async () => {
    renderRoutes(routes, `/confirmar-email?token=${MOCK_CONFIRMATION_TOKEN}`)
    expect(await screen.findByText('E-mail confirmado')).toBeInTheDocument()

    await expect(
      api.post('/auth/email-confirmation/confirm', { token: MOCK_CONFIRMATION_TOKEN }),
    ).rejects.toMatchObject({ response: { status: 422, data: { code: 'TOKEN_INVALIDO' } } })
  })

  it('sem token na URL: link inválido, sem chamar a API', async () => {
    const bodies = spyConfirm()
    renderRoutes(routes, '/confirmar-email')

    expect(screen.getByRole('alert')).toHaveTextContent('Link inválido ou expirado')
    expect(screen.getByRole('button', { name: 'Reenviar e-mail' })).toBeInTheDocument()
    expect(bodies).toHaveLength(0)
  })

  it('token vazio (?token=): link inválido, sem chamar a API', () => {
    const bodies = spyConfirm()
    renderRoutes(routes, '/confirmar-email?token=')

    expect(screen.getByRole('alert')).toHaveTextContent('Link inválido ou expirado')
    expect(bodies).toHaveLength(0)
  })

  it('erro do servidor (5xx): mensagem genérica e "Tentar novamente"', async () => {
    let calls = 0
    server.use(
      http.post('*/api/auth/email-confirmation/confirm', () => {
        calls += 1
        return calls === 1
          ? HttpResponse.json({ status: 500, code: 'ERRO_INTERNO' }, { status: 500 })
          : new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderRoutes(routes, '/confirmar-email?token=qualquer')

    const result = await screen.findByRole('alert')
    expect(result).toHaveTextContent('Não foi possível confirmar seu e-mail')
    expect(result).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    const success = await screen.findByText('E-mail confirmado')
    expect(success.closest('[role="status"]')).toHaveFocus()
    expect(calls).toBe(2)
  })

  it('erro de rede: mensagem genérica e "Tentar novamente"', async () => {
    server.use(http.post('*/api/auth/email-confirmation/confirm', () => HttpResponse.error()))
    renderRoutes(routes, '/confirmar-email?token=qualquer')

    expect(await screen.findByText('Não foi possível confirmar seu e-mail')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('qualquer')
  })
})
