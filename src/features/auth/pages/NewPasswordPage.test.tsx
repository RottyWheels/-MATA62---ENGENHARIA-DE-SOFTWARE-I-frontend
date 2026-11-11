import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MOCK_RESET_TOKEN } from '@/mocks/handlers/auth'
import { renderRoutes } from '@/test/render'

import { NewPasswordPage } from './NewPasswordPage'

const routes = [
  { path: '/redefinir-senha', element: <NewPasswordPage /> },
  { path: '/login', element: <p>tela de login</p> },
]

async function fillAndSubmit(user: ReturnType<typeof renderRoutes>['user'], password: string) {
  await user.type(screen.getByLabelText('Nova senha'), password)
  await user.type(screen.getByLabelText('Confirmar senha'), password)
  await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
}

describe('NewPasswordPage', () => {
  it('sem token, avisa que o link está incompleto', () => {
    renderRoutes(routes, '/redefinir-senha')

    expect(screen.getByText('Link incompleto')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  })

  it('redefine a senha com o token do e-mail', async () => {
    const { user } = renderRoutes(routes, `/redefinir-senha?token=${MOCK_RESET_TOKEN}`)

    await fillAndSubmit(user, 'Nova#Senha9')

    expect(await screen.findByText('Senha alterada')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Ir para o login' }))
    expect(await screen.findByText('tela de login')).toBeInTheDocument()
  })

  it('mostra o erro do backend para token inválido ou expirado', async () => {
    const { user } = renderRoutes(routes, '/redefinir-senha?token=vencido')

    await fillAndSubmit(user, 'Nova#Senha9')

    expect(
      await screen.findByText('Link de redefinição de senha inválido ou expirado.'),
    ).toBeInTheDocument()
  })

  it('aplica a política de senha antes de enviar', async () => {
    const { user } = renderRoutes(routes, `/redefinir-senha?token=${MOCK_RESET_TOKEN}`)

    await fillAndSubmit(user, 'semsimbolo1')

    expect(await screen.findByText('A senha precisa ter ao menos um símbolo.')).toBeInTheDocument()
  })
})
