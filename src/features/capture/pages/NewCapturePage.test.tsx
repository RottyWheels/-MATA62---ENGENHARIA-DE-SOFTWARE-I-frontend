import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { renderRoutes } from '@/test/render'
import { loginAsDemo, loginAsNewUser } from '@/test/session'

import { NewCapturePage } from './NewCapturePage'

const routes = [
  { path: '/capturas/nova', element: <NewCapturePage /> },
  { path: '/capturas/:id/sessao', element: <p>sessão de captura</p> },
  { path: '/creditos', element: <p>tela de créditos</p> },
]

type User = ReturnType<typeof renderRoutes>['user']

async function fill(user: User, title: string, url: string) {
  if (title) await user.type(screen.getByLabelText('Título do Registro'), title)
  if (url) await user.type(screen.getByLabelText('URL do site'), url)
}

describe('NewCapturePage', () => {
  it('mostra o custo do registro e o saldo antes de começar', async () => {
    await loginAsDemo()
    renderRoutes(routes, '/capturas/nova')

    expect(await screen.findByText('Este registro consome 1 crédito')).toBeInTheDocument()
    expect(await screen.findByText(/Seu saldo atual é de 10 créditos/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Como funciona' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar Registro' })).toBeEnabled()
  })

  it('valida o título e a URL antes de enviar', async () => {
    await loginAsDemo()
    const { user } = renderRoutes(routes, '/capturas/nova')

    await fill(user, '', 'imobiliaria-exemplo.com.br/anuncio')
    await user.click(screen.getByRole('button', { name: 'Iniciar Registro' }))

    expect(await screen.findByText('Informe o título do registro.')).toBeInTheDocument()
    expect(
      screen.getByText('Informe o endereço completo, começando com http:// ou https://.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Título do Registro')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('URL do site')).toHaveAttribute('aria-invalid', 'true')
  })

  it('cria a sessão e abre o navegador remoto', async () => {
    await loginAsDemo()
    let body: unknown
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/captures')) {
        void request
          .clone()
          .json()
          .then((json) => (body = json))
      }
    })
    const { user, router } = renderRoutes(routes, '/capturas/nova')

    await fill(user, '  Anúncio   do imóvel ', 'https://imobiliaria-exemplo.com.br/anuncio/4821')
    await user.click(screen.getByRole('button', { name: 'Iniciar Registro' }))

    expect(await screen.findByText('sessão de captura')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/capturas/cap-1/sessao')
    expect(body).toEqual({
      title: 'Anúncio do imóvel',
      url: 'https://imobiliaria-exemplo.com.br/anuncio/4821',
    })
    server.events.removeAllListeners()
  })

  it('sem saldo: avisa, leva para a compra e não deixa iniciar', async () => {
    await loginAsNewUser('sem-saldo@veridt.test')
    const { user } = renderRoutes(routes, '/capturas/nova')

    expect(await screen.findByText('Você não tem créditos suficientes')).toBeInTheDocument()
    expect(screen.getByText(/seu saldo é de 0 créditos/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar Registro' })).toBeDisabled()

    await user.click(screen.getByRole('link', { name: 'Comprar créditos' }))
    expect(await screen.findByText('tela de créditos')).toBeInTheDocument()
  })

  it('sem o saldo na tela (backend real), o 402 mostra o mesmo aviso', async () => {
    await loginAsDemo()
    // Como o backend atual: `GET /api/me` ainda não traz `creditBalance`.
    server.use(
      http.get('*/api/me', () =>
        HttpResponse.json({
          id: '1',
          fullName: 'Usuária Demo',
          email: 'demo@veridt.test',
          type: 'COMUM',
          oabRegistrations: [],
          createdAt: '2026-11-01T12:00:00Z',
        }),
      ),
      http.post('*/api/captures', () =>
        HttpResponse.json(
          {
            status: 402,
            code: 'SALDO_INSUFICIENTE',
            message: 'Seu saldo de créditos não cobre este registro.',
            errors: [],
          },
          { status: 402 },
        ),
      ),
    )
    const { user } = renderRoutes(routes, '/capturas/nova')
    const notice = await screen.findByRole('region', { name: 'Custo do registro' })
    expect(within(notice).queryByText(/Seu saldo atual/)).not.toBeInTheDocument()

    await fill(user, 'Anúncio', 'https://imobiliaria-exemplo.com.br/anuncio/4821')
    await user.click(screen.getByRole('button', { name: 'Iniciar Registro' }))

    expect(await screen.findByText('Você não tem créditos suficientes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar Registro' })).toBeDisabled()
  })

  it('mostra no campo o erro que vem do backend', async () => {
    await loginAsDemo()
    server.use(
      http.post('*/api/captures', () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'DADOS_INVALIDOS',
            message: 'Dados inválidos.',
            errors: [{ field: 'url', message: 'Este endereço não pode ser registrado.' }],
          },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoutes(routes, '/capturas/nova')

    await fill(user, 'Anúncio', 'https://imobiliaria-exemplo.com.br/anuncio/4821')
    await user.click(screen.getByRole('button', { name: 'Iniciar Registro' }))

    expect(await screen.findByText('Este endereço não pode ser registrado.')).toBeInTheDocument()
    expect(screen.getByText('Dados inválidos.')).toBeInTheDocument()
    expect(screen.getByLabelText('URL do site')).toHaveAttribute('aria-invalid', 'true')
  })
})
