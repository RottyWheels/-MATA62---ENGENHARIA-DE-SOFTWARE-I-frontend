import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DEMO_USER } from '@/mocks/handlers/auth'
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
})
