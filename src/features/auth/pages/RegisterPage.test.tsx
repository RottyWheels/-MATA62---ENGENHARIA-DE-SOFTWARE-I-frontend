import { screen, waitFor, within } from '@testing-library/react'
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

type User = ReturnType<typeof renderRegister>['user']

async function fillLawyer(user: User) {
  await user.click(screen.getByRole('radio', { name: 'Advogado' }))
  await user.type(screen.getByLabelText('Nome completo'), 'Bruno Lima')
  await user.type(screen.getByLabelText('E-mail'), 'bruno@x.test')
  await user.type(screen.getByLabelText('CPF'), '11144477735')
  await user.type(screen.getByLabelText('Senha'), 'Senha#Forte1')
  await user.type(screen.getByLabelText('Confirmar senha'), 'Senha#Forte1')
}

async function chooseType(user: User, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }))
}

describe('RegisterPage: várias inscrições na OAB', () => {
  it('envia todas as inscrições com o tipo de cada uma', async () => {
    let body: unknown
    server.use(
      http.post('*/api/auth/register', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ email: 'bruno@x.test' }, { status: 201 })
      }),
    )
    const { user } = renderRegister()
    await fillLawyer(user)

    await user.type(screen.getByLabelText('Número da OAB'), '12345/ba')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    // A segunda já começa como suplementar.
    expect(screen.getByRole('combobox', { name: 'Tipo da inscrição 2' })).toHaveTextContent(
      'Suplementar',
    )
    await user.type(screen.getByLabelText('Número da OAB, inscrição 2'), '999/sp')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    await user.type(screen.getByLabelText('Número da OAB, inscrição 3'), '00777/ba')
    await chooseType(user, 'Tipo da inscrição 3', 'Estagiário')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('tela de login')).toBeInTheDocument()
    expect(body).toMatchObject({
      type: 'ADVOGADO',
      oabRegistrations: [
        { number: '12345', state: 'BA', type: 'PRINCIPAL' },
        { number: '999', state: 'SP', type: 'SUPLEMENTAR' },
        { number: '00777', state: 'BA', type: 'ESTAGIARIO' },
      ],
    })
  })

  it('recusa duas principais e inscrições repetidas, como o backend', async () => {
    const { user } = renderRegister()
    await fillLawyer(user)

    await user.type(screen.getByLabelText('Número da OAB'), '12345/BA')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    await user.type(screen.getByLabelText('Número da OAB, inscrição 2'), '12345/BA')
    await chooseType(user, 'Tipo da inscrição 2', 'Principal')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    // Zeros à esquerda não escapam da repetição: 012345/BA é a mesma inscrição.
    await user.type(screen.getByLabelText('Número da OAB, inscrição 3'), '012345/BA')
    await chooseType(user, 'Tipo da inscrição 3', 'Principal')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findAllByText('Inscrição repetida.')).toHaveLength(2)
    expect(screen.getAllByText('Só pode haver uma inscrição principal.')).toHaveLength(2)
    expect(screen.getByLabelText('Número da OAB')).not.toHaveAttribute('aria-invalid')
  })

  it('atualiza os erros entre linhas quando a outra inscrição muda', async () => {
    const { user } = renderRegister()
    await fillLawyer(user)
    await user.type(screen.getByLabelText('Número da OAB'), '12345/BA')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    await user.type(screen.getByLabelText('Número da OAB, inscrição 2'), '999/SP')
    await chooseType(user, 'Tipo da inscrição 2', 'Principal')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('Só pode haver uma inscrição principal.')).toBeInTheDocument()

    // Corrigir a PRIMEIRA linha resolve o erro mostrado na segunda.
    await chooseType(user, 'Tipo', 'Suplementar')

    await waitFor(() =>
      expect(screen.queryByText('Só pode haver uma inscrição principal.')).not.toBeInTheDocument(),
    )
  })

  it('remove a repetição quando a primeira linha muda', async () => {
    const { user } = renderRegister()
    await fillLawyer(user)
    await user.type(screen.getByLabelText('Número da OAB'), '12345/BA')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    await user.type(screen.getByLabelText('Número da OAB, inscrição 2'), '12345/BA')
    await chooseType(user, 'Tipo da inscrição 2', 'Principal')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('Inscrição repetida.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Número da OAB'))
    await user.type(screen.getByLabelText('Número da OAB'), '54321/BA')

    await waitFor(() => expect(screen.queryByText('Inscrição repetida.')).not.toBeInTheDocument())
  })

  it('remove inscrições, mas mantém sempre a primeira', async () => {
    const { user } = renderRegister()
    await user.click(screen.getByRole('radio', { name: 'Advogado' }))

    expect(screen.queryByRole('button', { name: /Remover inscrição/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    await user.type(screen.getByLabelText('Número da OAB, inscrição 2'), '999/SP')
    await user.click(screen.getByRole('button', { name: 'Remover inscrição 2' }))

    expect(screen.queryByLabelText('Número da OAB, inscrição 2')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Número da OAB')).toBeInTheDocument()
  })

  it('remover uma linha revalida as outras e devolve o foco para a anterior', async () => {
    const { user } = renderRegister()
    await fillLawyer(user)
    await user.type(screen.getByLabelText('Número da OAB'), '12345/BA')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    await user.type(screen.getByLabelText('Número da OAB, inscrição 2'), '999/SP')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    await user.type(screen.getByLabelText('Número da OAB, inscrição 3'), '999/SP')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('Inscrição repetida.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remover inscrição 2' }))

    await waitFor(() => expect(screen.queryByText('Inscrição repetida.')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Número da OAB')).toHaveFocus()
  })

  it('a nova linha vem como principal se nenhuma for principal', async () => {
    const { user } = renderRegister()
    await user.click(screen.getByRole('radio', { name: 'Advogado' }))
    await chooseType(user, 'Tipo', 'Estagiário')

    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))

    expect(screen.getByRole('combobox', { name: 'Tipo da inscrição 2' })).toHaveTextContent(
      'Principal',
    )
    expect(screen.getByLabelText('Número da OAB, inscrição 2')).toHaveFocus()
  })

  it('leva o erro do backend para a inscrição certa', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'DADOS_INVALIDOS',
            message: 'Dados inválidos.',
            errors: [{ field: 'oabRegistrations[1].number', message: 'número inválido' }],
          },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRegister()
    await fillLawyer(user)
    await user.type(screen.getByLabelText('Número da OAB'), '12345/BA')
    await user.click(screen.getByRole('button', { name: 'Adicionar inscrição' }))
    await user.type(screen.getByLabelText('Número da OAB, inscrição 2'), '999/SP')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('número inválido')).toBeInTheDocument()
    expect(screen.getByLabelText('Número da OAB, inscrição 2')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Número da OAB')).not.toHaveAttribute('aria-invalid')
  })

  it('mostra o conflito de OAB (409) junto da lista de inscrições', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(
          { status: 409, code: 'OAB_JA_CADASTRADA', message: 'Inscrição na OAB já cadastrada.' },
          { status: 409 },
        ),
      ),
    )
    const { user } = renderRegister()
    await fillLawyer(user)
    await user.type(screen.getByLabelText('Número da OAB'), '12345/BA')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findAllByText('Inscrição na OAB já cadastrada.')).toHaveLength(2)
  })
})
