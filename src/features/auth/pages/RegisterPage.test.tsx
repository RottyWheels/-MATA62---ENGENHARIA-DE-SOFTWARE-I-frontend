import { screen, waitFor } from '@testing-library/react'
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

  it('envia CPF só com dígitos e a OAB como inscrição principal', async () => {
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
            oabRegistrations: [{ number: '12345', state: 'BA', type: 'PRINCIPAL' }],
            createdAt: '2026-11-11T12:00:00Z',
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
    await user.type(screen.getByLabelText('Senha'), 'Senha#Forte1')
    await user.type(screen.getByLabelText('Confirmar senha'), 'Senha#Forte1')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('tela de login')).toBeInTheDocument()
    expect(body).toEqual({
      type: 'ADVOGADO',
      fullName: 'Ana Souza',
      email: 'ana@x.test',
      password: 'Senha#Forte1',
      cpf: '52998224725',
      oabRegistrations: [{ number: '12345', state: 'BA', type: 'PRINCIPAL' }],
    })
  })

  it('exige letra, número e símbolo na senha, como o backend', async () => {
    const { user } = renderRegister()

    await user.type(screen.getByLabelText('Senha'), 'senhasemnumero')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('A senha precisa ter ao menos um número.')).toBeInTheDocument()
  })

  it('mostra os erros de campo do backend (inclusive das inscrições na OAB)', async () => {
    const error: ProblemDetail = {
      status: 400,
      code: 'DADOS_INVALIDOS',
      message: 'Dados inválidos.',
      errors: [{ field: 'oabRegistrations[0].number', message: 'deve ter até 6 dígitos' }],
    }
    server.use(http.post('*/api/auth/register', () => HttpResponse.json(error, { status: 400 })))
    const { user } = renderRegister()

    await user.click(screen.getByRole('radio', { name: 'Advogado' }))
    await user.type(screen.getByLabelText('Nome completo'), 'Ana Souza')
    await user.type(screen.getByLabelText('E-mail'), 'ana@x.test')
    await user.type(screen.getByLabelText('CPF'), '52998224725')
    await user.type(screen.getByLabelText('Número da OAB'), '12345/BA')
    await user.type(screen.getByLabelText('Senha'), 'Senha#Forte1')
    await user.type(screen.getByLabelText('Confirmar senha'), 'Senha#Forte1')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('deve ter até 6 dígitos')).toBeInTheDocument()
    expect(screen.getByText('Dados inválidos.')).toBeInTheDocument()
    expect(screen.getByLabelText('Número da OAB')).toHaveAttribute('aria-invalid', 'true')
  })

  it('leva o conflito de e-mail (409) para o campo', async () => {
    const { user } = renderRegister()

    // O usuário de demonstração dos mocks já usa este e-mail.
    await user.type(screen.getByLabelText('Nome completo'), 'Ana Souza')
    await user.type(screen.getByLabelText('E-mail'), 'demo@veridt.test')
    await user.type(screen.getByLabelText('CPF'), '11144477735')
    await user.type(screen.getByLabelText('Senha'), 'Senha#Forte1')
    await user.type(screen.getByLabelText('Confirmar senha'), 'Senha#Forte1')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() =>
      expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true'),
    )
    expect(screen.getAllByText('E-mail já cadastrado.')).toHaveLength(2)
  })
})
