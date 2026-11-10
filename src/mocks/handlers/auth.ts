import { delay, http, HttpResponse } from 'msw'

import type { LoginRequest, PasswordResetRequest, RegisterRequest, User } from '@/features/auth'
import type { ProblemDetail } from '@/shared/api/problem-detail'

/**
 * Backend de autenticação em memória (contrato provisório da §5.5).
 * O estado some ao recarregar a página — de propósito, nada vai para o storage.
 */

type StoredUser = User & { password: string; cpf: string }

/** Usuário de demonstração para o modo com mocks (documentado no README). */
export const DEMO_USER = {
  email: 'demo@veridt.test',
  password: 'senha-demo-123',
} as const

const db = {
  users: new Map<string, StoredUser>(),
  currentUserId: null as string | null,
}

let nextId = 1

function seed() {
  db.users.clear()
  db.currentUserId = null
  nextId = 1
  db.users.set(DEMO_USER.email, {
    id: String(nextId++),
    fullName: 'Usuária Demo',
    email: DEMO_USER.email,
    password: DEMO_USER.password,
    cpf: '52998224725',
    type: 'COMUM',
    creditBalance: 10,
  })
}
seed()

/** Volta ao estado inicial (usado entre testes). */
export function resetAuthMock() {
  seed()
}

function toUser({ password: _password, cpf: _cpf, ...user }: StoredUser): User {
  return user
}

function problem(status: number, title: string, detail?: string, errors?: ProblemDetail['errors']) {
  const body: ProblemDetail = { type: 'about:blank', title, status, detail, errors }
  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function currentUser() {
  if (!db.currentUserId) return undefined
  return [...db.users.values()].find((u) => u.id === db.currentUserId)
}

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
    if (!user) return problem(401, 'Unauthorized', 'Sessão inexistente ou expirada.')
    return HttpResponse.json(toUser(user))
  }),

  http.post('*/api/auth/login', async ({ request }) => {
    await delay()
    const { email, password } = (await request.json()) as LoginRequest
    const user = db.users.get(email.trim().toLowerCase())
    if (!user || user.password !== password) {
      return problem(401, 'Unauthorized', 'E-mail ou senha inválidos.')
    }
    db.currentUserId = user.id
    return HttpResponse.json(toUser(user))
  }),

  http.post('*/api/auth/logout', async () => {
    await delay(100)
    db.currentUserId = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/auth/register', async ({ request }) => {
    await delay()
    const body = (await request.json()) as RegisterRequest
    const email = body.email.trim().toLowerCase()
    const errors: NonNullable<ProblemDetail['errors']> = []

    if (db.users.has(email)) errors.push({ field: 'email', message: 'E-mail já cadastrado.' })
    if ([...db.users.values()].some((u) => u.cpf === body.cpf)) {
      errors.push({ field: 'cpf', message: 'CPF já cadastrado.' })
    }
    if (body.type === 'ADVOGADO' && !body.oabNumber) {
      errors.push({ field: 'oabNumber', message: 'Informe o número da OAB.' })
    }
    if (errors.length > 0) {
      return problem(400, 'Bad Request', 'Verifique os dados informados.', errors)
    }

    const user: StoredUser = {
      id: String(nextId++),
      fullName: body.fullName,
      email,
      password: body.password,
      cpf: body.cpf,
      type: body.type,
      creditBalance: 0,
    }
    db.users.set(email, user)
    return HttpResponse.json(toUser(user), { status: 201 })
  }),

  http.post('*/api/auth/password-reset', async ({ request }) => {
    await delay()
    ;(await request.json()) as PasswordResetRequest
    return new HttpResponse(null, { status: 202 })
  }),
]
