import { delay, http, HttpResponse } from 'msw'

import type {
  LoginRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterRequest,
  User,
} from '@/features/auth'
import type { ProblemDetail } from '@/shared/api/problem-detail'

import { problem } from '../utils'

/**
 * Backend de autenticação em memória, imitando o módulo `identity` do backend
 * (respostas, códigos de erro e o formato `ErrorResponse`). O saldo de créditos
 * é a única parte provisória: o backend ainda não tem o módulo `credits`.
 * O estado some ao recarregar a página — de propósito, nada vai para o storage.
 */

type StoredUser = User & { password: string; cpf: string }

/** Usuário de demonstração para o modo com mocks (documentado no README). */
export const DEMO_USER = {
  email: 'demo@veridt.test',
  password: 'senha-demo-123',
} as const

/** Token aceito por `POST /api/auth/password-reset/confirm` nos mocks. */
export const MOCK_RESET_TOKEN = 'token-de-teste'

const db = {
  users: new Map<string, StoredUser>(),
  currentUserId: null as string | null,
}

let nextId = 1

function newId() {
  return `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`
}

function seed() {
  db.users.clear()
  db.currentUserId = null
  nextId = 1
  db.users.set(DEMO_USER.email, {
    id: newId(),
    fullName: 'Usuária Demo',
    email: DEMO_USER.email,
    password: DEMO_USER.password,
    cpf: '52998224725',
    type: 'COMUM',
    oabRegistrations: [],
    createdAt: '2026-11-01T12:00:00Z',
    creditBalance: 10,
  })
}
seed()

/** Volta ao estado inicial (usado entre testes). */
export function resetAuthMock() {
  seed()
}

/** Como o `UserResponse` do backend: sem senha e sem CPF. */
function toUser({ password: _password, cpf: _cpf, ...user }: StoredUser): User {
  return user
}

function currentUser() {
  if (!db.currentUserId) return undefined
  return [...db.users.values()].find((u) => u.id === db.currentUserId)
}

/** Usuário da sessão simulada (usado pelos mocks de outras features). */
export function getSessionUser(): User | undefined {
  const user = currentUser()
  return user ? toUser(user) : undefined
}

/** Soma créditos ao saldo de um usuário (confirmação de pagamento simulada). */
export function addCredits(userId: string, credits: number) {
  const user = [...db.users.values()].find((u) => u.id === userId)
  if (user) user.creditBalance = (user.creditBalance ?? 0) + credits
}

const unauthenticated = () => problem(401, 'NAO_AUTENTICADO', 'Autenticação necessária.')

export const authHandlers = [
  http.get('*/api/auth/csrf', () => {
    // Grava o cookie direto (o handler roda na página). Um `Set-Cookie` no mock
    // faria o MSW guardar o cookie no localStorage, o que queremos evitar.
    if (typeof document !== 'undefined') {
      document.cookie = `XSRF-TOKEN=mock-${Date.now()}; path=/; SameSite=Lax`
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/me', async () => {
    await delay(150)
    const user = currentUser()
    if (!user) return unauthenticated()
    return HttpResponse.json(toUser(user))
  }),

  http.post('*/api/auth/login', async ({ request }) => {
    await delay()
    const { email, password } = (await request.json()) as LoginRequest
    const user = db.users.get(email.trim().toLowerCase())
    if (!user || user.password !== password) {
      return problem(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.')
    }
    db.currentUserId = user.id
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/auth/logout', async () => {
    await delay(100)
    if (!db.currentUserId) return unauthenticated()
    db.currentUserId = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/auth/register', async ({ request }) => {
    await delay()
    const body = (await request.json()) as RegisterRequest
    const email = body.email.trim().toLowerCase()
    const oab = body.oabRegistrations ?? []

    const errors: NonNullable<ProblemDetail['errors']> = []
    if (body.type === 'ADVOGADO' && oab.length === 0) {
      errors.push({
        field: 'oabRegistrations',
        message: 'obrigatório para advogado: informe ao menos uma inscrição',
      })
    }
    if (body.type !== 'ADVOGADO' && oab.length > 0) {
      errors.push({ field: 'oabRegistrations', message: 'só pode ser informado por advogado' })
    }
    if (errors.length > 0) return problem(400, 'DADOS_INVALIDOS', 'Dados inválidos.', errors)

    // Como o backend: conflitos vêm um por vez, sem `errors[]`, identificados pelo `code`.
    if (db.users.has(email)) return problem(409, 'EMAIL_JA_CADASTRADO', 'E-mail já cadastrado.')
    if ([...db.users.values()].some((u) => u.cpf === body.cpf)) {
      return problem(409, 'CPF_JA_CADASTRADO', 'CPF já cadastrado.')
    }

    const user: StoredUser = {
      id: newId(),
      fullName: body.fullName,
      email,
      password: body.password,
      cpf: body.cpf,
      type: body.type,
      oabRegistrations: oab,
      createdAt: new Date().toISOString(),
      creditBalance: 0,
    }
    db.users.set(email, user)
    return HttpResponse.json(toUser(user), { status: 201 })
  }),

  http.post('*/api/auth/password-reset', async ({ request }) => {
    await delay()
    ;(await request.json()) as PasswordResetRequest
    // Sempre 202: a resposta não revela se o e-mail tem conta.
    return new HttpResponse(null, { status: 202 })
  }),

  http.post('*/api/auth/password-reset/confirm', async ({ request }) => {
    await delay()
    const { token, newPassword } = (await request.json()) as PasswordResetConfirmRequest
    const demo = db.users.get(DEMO_USER.email)
    if (token !== MOCK_RESET_TOKEN || !demo) {
      return problem(422, 'TOKEN_INVALIDO', 'Link de redefinição de senha inválido ou expirado.')
    }
    demo.password = newPassword
    return new HttpResponse(null, { status: 204 })
  }),
]
