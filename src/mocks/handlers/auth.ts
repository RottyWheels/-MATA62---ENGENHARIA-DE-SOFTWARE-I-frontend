import { delay, http, HttpResponse } from 'msw'

import type {
  ConfirmEmailRequest,
  LoginRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterRequest,
  ResendConfirmationRequest,
  User,
} from '@/features/auth'
import type { ProblemDetail } from '@/shared/api/problem-detail'

import { problem } from '../utils'

/**
 * Backend de autenticação em memória, imitando o módulo `identity` do backend
 * (respostas, códigos de erro e o formato `ErrorResponse`). O saldo de créditos fica guardado
 * aqui por praticidade, mas, como no backend, não sai em `GET /api/me`: vem de
 * `GET /api/credits/balance` (mock de créditos).
 * O estado some ao recarregar a página — de propósito, nada vai para o storage.
 */

type StoredUser = Omit<User, 'cpfMasked'> & {
  password: string
  cpf: string
  /** Saldo de créditos: só o mock de créditos o expõe. */
  balance: number
  emailConfirmed: boolean
  /** Último link de confirmação enviado: cada envio invalida o anterior, como no backend. */
  confirmationToken?: string
  confirmationSentAt?: number
}

/** Usuário de demonstração para o modo com mocks (documentado no README). */
export const DEMO_USER = {
  email: 'demo@veridt.test',
  password: 'senha-demo-123',
} as const

/** Token aceito por `POST /api/auth/password-reset/confirm` nos mocks. */
export const MOCK_RESET_TOKEN = 'token-de-teste'

/** Conta de exemplo com o e-mail ainda não confirmado: o login responde 403. */
export const UNCONFIRMED_USER = {
  email: 'pendente@veridt.test',
  password: 'senha-pendente-123',
} as const

/** Token que confirma a conta `UNCONFIRMED_USER` (`/confirmar-email?token=…`). */
export const MOCK_CONFIRMATION_TOKEN = 'token-de-confirmacao'

/** Como no backend: um reenvio para a mesma conta antes disso é ignorado (mas responde 202). */
const RESEND_INTERVAL_MS = 60_000

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
    balance: 10,
    emailConfirmed: true,
  })
  db.users.set(UNCONFIRMED_USER.email, {
    id: newId(),
    fullName: 'Conta Pendente',
    email: UNCONFIRMED_USER.email,
    password: UNCONFIRMED_USER.password,
    cpf: '12345678909',
    type: 'COMUM',
    oabRegistrations: [],
    createdAt: '2026-11-15T12:00:00Z',
    balance: 0,
    emailConfirmed: false,
    confirmationToken: MOCK_CONFIRMATION_TOKEN,
    confirmationSentAt: 0,
  })
}
seed()

/** Volta ao estado inicial (usado entre testes). */
export function resetAuthMock() {
  seed()
}

/** `52998224725` → `***.982.247-**`, como o backend. */
function maskCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, '')
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
}

/**
 * Como o `UserResponse` do backend: sem senha, CPF completo, saldo e dados da confirmação.
 * O CPF só sai mascarado (`cpfMasked`).
 */
function toUser({
  password: _password,
  cpf,
  balance: _balance,
  emailConfirmed: _emailConfirmed,
  confirmationToken: _confirmationToken,
  confirmationSentAt: _confirmationSentAt,
  ...user
}: StoredUser): User {
  return { ...user, cpfMasked: maskCpf(cpf) }
}

/**
 * "Envia" o e-mail de confirmação: gera um token novo, que invalida o anterior. Sem servidor de
 * e-mail, o link aparece no console do navegador, no papel do Mailpit (só no `pnpm dev` com mocks).
 */
function sendConfirmationEmail(user: StoredUser) {
  user.confirmationToken = crypto.randomUUID()
  user.confirmationSentAt = Date.now()
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.info(
      `[mocks] E-mail de confirmação para ${user.email}: /confirmar-email?token=${user.confirmationToken}`,
    )
  }
}

/** Confirma o e-mail de uma conta dos mocks sem passar pelo link (usado pelos testes). */
export function confirmMockEmail(email: string) {
  const user = db.users.get(email.trim().toLowerCase())
  if (user) {
    user.emailConfirmed = true
    user.confirmationToken = undefined
  }
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

/** Saldo de créditos de um usuário (`GET /api/credits/balance` nos mocks). */
export function getBalance(userId: string) {
  return [...db.users.values()].find((u) => u.id === userId)?.balance ?? 0
}

/** Soma créditos ao saldo de um usuário (confirmação de pagamento simulada). */
export function addCredits(userId: string, credits: number) {
  const user = [...db.users.values()].find((u) => u.id === userId)
  if (user) user.balance += credits
}

/** Desconta créditos; `false` se o saldo não cobrir (o saldo não muda). */
export function spendCredits(userId: string, credits: number) {
  const user = [...db.users.values()].find((u) => u.id === userId)
  if (!user || user.balance < credits) return false
  user.balance -= credits
  return true
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
    // Como no backend: conferido depois da senha, e nenhuma sessão é criada.
    if (!user.emailConfirmed) {
      return problem(
        403,
        'EMAIL_NAO_CONFIRMADO',
        'Confirme seu e-mail antes de entrar. Enviamos um link para o endereço cadastrado.',
      )
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
      balance: 0,
      // A conta nasce sem o e-mail confirmado: o login só funciona depois do link.
      emailConfirmed: false,
    }
    db.users.set(email, user)
    sendConfirmationEmail(user)
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
    // Como no backend: o link chegou pelo e-mail, então redefinir a senha também confirma o e-mail.
    demo.emailConfirmed = true
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/auth/email-confirmation/confirm', async ({ request }) => {
    await delay()
    const { token } = (await request.json()) as ConfirmEmailRequest
    if (!token?.trim()) {
      return problem(400, 'DADOS_INVALIDOS', 'Dados inválidos.', [
        { field: 'token', message: 'não deve estar em branco' },
      ])
    }
    // Inexistente, já usado ou substituído por um reenvio: a mesma resposta nos três casos.
    const user = [...db.users.values()].find((u) => u.confirmationToken === token)
    if (!user) {
      return problem(422, 'TOKEN_INVALIDO', 'Link de confirmação de e-mail inválido ou expirado.')
    }
    user.emailConfirmed = true
    user.confirmationToken = undefined
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/auth/email-confirmation/resend', async ({ request }) => {
    await delay()
    const { email } = (await request.json()) as ResendConfirmationRequest
    if (!email || !/^[^\s@]+@[^\s@]+$/.test(email.trim())) {
      return problem(400, 'DADOS_INVALIDOS', 'Dados inválidos.', [
        { field: 'email', message: 'deve ser um endereço de e-mail bem formado' },
      ])
    }
    const user = db.users.get(email.trim().toLowerCase())
    const recent = Date.now() - (user?.confirmationSentAt ?? 0) < RESEND_INTERVAL_MS
    if (user && !user.emailConfirmed && !recent) sendConfirmationEmail(user)
    // Sempre 202: a resposta não revela se o e-mail tem conta, nem se já foi confirmado.
    return new HttpResponse(null, { status: 202 })
  }),
]
