import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'

import { DEMO_USER, UNCONFIRMED_USER } from '@/mocks/handlers/auth'
import { server } from '@/mocks/server'
import { renderRoutes } from '@/test/render'

import { RedirectIfAuthenticated } from '../components/RedirectIfAuthenticated'
import { LoginPage } from './LoginPage'

// Como no app: o redirecionamento após o login é feito pelo RedirectIfAuthenticated.
const routes = [
  { element: <RedirectIfAuthenticated />, children: [{ path: '/login', element: <LoginPage /> }] },
  { path: '/creditos', element: <p>créditos</p> },
  { path: '/', element: <p>início</p> },
]

describe('LoginPage', () => {
  it('mostra erro geral com credenciais inválidas', async () => {
    const { user } = renderRoutes(routes, '/login')

    await user.type(await screen.findByLabelText('E-mail'), DEMO_USER.email)
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
  })

  it('entra e segue o ?redirect=', async () => {
    const { user } = renderRoutes(routes, '/login?redirect=%2Fcreditos')

    await user.type(await screen.findByLabelText('E-mail'), DEMO_USER.email)
    await user.type(screen.getByLabelText('Senha'), DEMO_USER.password)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('créditos')).toBeInTheDocument()
  })

  it('ignora redirect externo (open redirect)', async () => {
    const { user } = renderRoutes(routes, '/login?redirect=%2F%2Fmalicioso.test')

    await user.type(await screen.findByLabelText('E-mail'), DEMO_USER.email)
    await user.type(screen.getByLabelText('Senha'), DEMO_USER.password)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('início')).toBeInTheDocument()
  })

  it('com o e-mail não confirmado (403), pede a confirmação e oferece o reenvio', async () => {
    const toastSpy = vi.spyOn(toast, 'error')
    let resendBody: unknown
    server.use(
      http.post('*/api/auth/email-confirmation/resend', async ({ request }) => {
        resendBody = await request.json()
        return new HttpResponse(null, { status: 202 })
      }),
    )
    const { user } = renderRoutes(routes, '/login')

    await user.type(await screen.findByLabelText('E-mail'), UNCONFIRMED_USER.email)
    await user.type(screen.getByLabelText('Senha'), UNCONFIRMED_USER.password)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent('Confirme seu e-mail antes de entrar')
    expect(notice).toHaveTextContent(UNCONFIRMED_USER.email)
    expect(notice).toHaveFocus()
    // Nem a mensagem de credenciais inválidas, nem o toast de CSRF ("Acesso negado").
    expect(screen.queryByText('E-mail ou senha inválidos.')).not.toBeInTheDocument()
    expect(toastSpy).not.toHaveBeenCalled()

    // O reenvio usa o e-mail digitado no formulário.
    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))
    expect(
      await screen.findByText(
        /Se houver uma conta pendente com esse e-mail, enviamos um novo link/,
      ),
    ).toHaveFocus()
    expect(resendBody).toEqual({ email: UNCONFIRMED_USER.email })
  })

  it('senha errada continua com o 401 de credenciais inválidas, mesmo sem confirmação', async () => {
    const { user } = renderRoutes(routes, '/login')

    await user.type(await screen.findByLabelText('E-mail'), UNCONFIRMED_USER.email)
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
    expect(screen.queryByText('Confirme seu e-mail antes de entrar')).not.toBeInTheDocument()
  })
})
