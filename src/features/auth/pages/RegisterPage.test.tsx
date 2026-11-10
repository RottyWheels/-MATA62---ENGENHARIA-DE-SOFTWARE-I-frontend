import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import type { ProblemDetail } from '@/shared/api/problem-detail'
import { renderRoutes } from '@/test/render'

import { RegisterPage } from './RegisterPage'

const routes = [
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/login', element: <p>tela de login</p> },
]

function renderRegister() {
  return renderRoutes(routes, '/cadastro')
}

describe('RegisterPage', () => {
  it('mostra o campo OAB só para advogado', async () => {
    const { user } = renderRegister()

    expect(screen.getByRole('radio', { name: 'Usuário Comum' })).toBeChecked()
    expect(screen.queryByLabelText('Número da OAB')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Advogado' }))
    expect(screen.getByLabelText('Número da OAB')).toBeInTheDocument()
    expect(screen.getByLabelText('Número da OAB')).toHaveAttribute('placeholder', '000000/UF')

    await user.click(screen.getByRole('radio', { name: 'Usuário Comum' }))
    expect(screen.queryByLabelText('Número da OAB')).not.toBeInTheDocument()
  })

  it('exige a OAB de advogado e valida os campos em português', async () => {
    const { user } = renderRegister()

    await user.click(screen.getByRole('radio', { name: 'Advogado' }))
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Informe o número da OAB.')).toBeInTheDocument()
    expect(screen.getByText('Informe o nome completo.')).toBeInTheDocument()
    expect(screen.getByLabelText('Número da OAB')).toHaveAttribute('aria-invalid', 'true')
  })

  it('valida o formato da OAB (número/UF)', async () => {
    const { user } = renderRegister()

    await user.click(screen.getByRole('radio', { name: 'Advogado' }))
    await user.type(screen.getByLabelText('Número da OAB'), '12345/XX')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Use o formato número/UF, ex.: 12345/BA.')).toBeInTheDocument()
  })

  it('não exige OAB de usuário comum e aplica máscara e validação do CPF', async () => {
    const { user } = renderRegister()

    const cpf = screen.getByLabelText('CPF')
    await user.type(cpf, '52998224724')
    expect(cpf).toHaveValue('529.982.247-24')

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('CPF inválido.')).toBeInTheDocument()
    expect(screen.queryByText('Informe o número da OAB.')).not.toBeInTheDocument()
  })

  it('envia CPF só com dígitos e OAB como "<numero>/<UF>"', async () => {
    let body: unknown
    server.use(
      http.post('*/api/auth/register', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          {
            id: '9',
            fullName: 'Ana Souza',
            email: 'ana@x.test',
            type: 'ADVOGADO',
            creditBalance: 0,
          },
          { status: 201 },
        )
      }),
    )
    const { user } = renderRegister()

    await user.click(screen.getByRole('radio', { name: 'Advogado' }))
    await user.type(screen.getByLabelText('Nome completo'), 'Ana  Souza')
    await user.type(screen.getByLabelText('E-mail'), 'ANA@x.test')
    await user.type(screen.getByLabelText('CPF'), '52998224725')
    await user.type(screen.getByLabelText('Número da OAB'), '12345/ba')
    await user.type(screen.getByLabelText('Senha'), 'senha-segura')
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('tela de login')).toBeInTheDocument()
    expect(body).toEqual({
      type: 'ADVOGADO',
      fullName: 'Ana Souza',
      email: 'ana@x.test',
      password: 'senha-segura',
      cpf: '52998224725',
      oabNumber: '12345/BA',
    })
  })

  it('mostra os erros do backend (ProblemDetail) nos campos', async () => {
    const problem: ProblemDetail = {
      status: 400,
      title: 'Bad Request',
      detail: 'Verifique os dados informados.',
      errors: [{ field: 'email', message: 'E-mail já cadastrado.' }],
    }
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(problem, {
          status: 400,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    )
    const { user } = renderRegister()

    await user.type(screen.getByLabelText('Nome completo'), 'Ana Souza')
    await user.type(screen.getByLabelText('E-mail'), 'ana@x.test')
    await user.type(screen.getByLabelText('CPF'), '52998224725')
    await user.type(screen.getByLabelText('Senha'), 'senha-segura')
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('E-mail já cadastrado.')).toBeInTheDocument()
    expect(screen.getByText('Verifique os dados informados.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })
})
