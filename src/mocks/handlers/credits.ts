import { delay, http, HttpResponse } from 'msw'

import type {
  CreditPackage,
  Payment,
  PaymentPage,
  PaymentSimulationRequest,
  PurchaseRequest,
} from '@/features/credits'
import type { ProblemDetail } from '@/shared/api/problem-detail'
import { isValidCpf, isValidUf, onlyDigits } from '@/shared/lib/validators'

import { problem } from '../utils'
import { addCredits, getBalance, getSessionUser } from './auth'

/**
 * Backend de créditos em memória, imitando o módulo `credits` do backend (branch
 * `feature/credits`): status em português, `Idempotency-Key` obrigatório (201 na primeira vez,
 * 200 ao repetir), 422 `PACOTE_INDISPONIVEL`, 400 com `billing.*` e 404 `PAGAMENTO_NAO_ENCONTRADO`.
 * Como no backend sem provedor, o pedido fica `PENDENTE` até a simulação aprovar ou recusar.
 */

/** Os mesmos pacotes (e valores provisórios) da migração `V6__creditos.sql` do backend. */
export const MOCK_PACKAGES: CreditPackage[] = [
  {
    id: 'BASICO',
    name: 'Básico',
    credits: 10,
    pricePerCredit: 5,
    price: 50,
    description: 'Ideal para registros pontuais',
  },
  {
    id: 'MEDIO',
    name: 'Médio',
    credits: 50,
    pricePerCredit: 4.5,
    price: 225,
    description: '10% de desconto por crédito',
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    credits: 100,
    pricePerCredit: 4,
    price: 400,
    description: '20% de desconto por crédito',
  },
]

/** PNG transparente de 1×1 pixel: o mesmo "QR Code" do provedor falso do backend. */
const PLACEHOLDER_QR_CODE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{1,100}$/

type StoredPayment = Payment & { userId: string; idempotencyKey: string }

/** ID do n-ésimo pedido criado nos mocks (1, 2, …), para os testes. */
export const mockPaymentId = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`

const payments = new Map<string, StoredPayment>()
let nextPaymentId = 1

export function resetCreditsMock() {
  payments.clear()
  nextPaymentId = 1
}

/** Aprova ou recusa um pedido pendente, como `PaymentConfirmationService` (repetir não faz nada). */
export function decideMockPayment(id: string, approved: boolean) {
  const payment = payments.get(id)
  if (!payment || payment.status !== 'PENDENTE') return
  payment.status = approved ? 'APROVADO' : 'RECUSADO'
  payment.decidedAt = new Date().toISOString()
  if (approved) addCredits(payment.userId, payment.credits)
}

function publicPayment({ userId: _u, idempotencyKey: _k, ...payment }: StoredPayment): Payment {
  return payment
}

const unauthenticated = () => problem(401, 'NAO_AUTENTICADO', 'Autenticação necessária.')
const notFound = () => problem(404, 'PAGAMENTO_NAO_ENCONTRADO', 'Pagamento não encontrado.')

/** As mesmas regras do `BillingInfoRequest` do backend, com os campos no formato `billing.*`. */
function billingErrors(billing: PurchaseRequest['billing'] | undefined) {
  const errors: NonNullable<ProblemDetail['errors']> = []
  const add = (field: string, message: string) =>
    errors.push({ field: `billing.${field}`, message })
  const blank = (value: string | undefined) => !value?.trim()
  if (!billing) return [{ field: 'billing', message: 'não deve ser nulo' }]
  if (blank(billing.fullName)) add('fullName', 'não deve estar em branco')
  if (blank(billing.email)) add('email', 'não deve estar em branco')
  if (!/^\d{10,11}$/.test(billing.phone ?? '')) add('phone', 'Telefone com DDD, só dígitos')
  if (!isValidCpf(onlyDigits(billing.cpf ?? ''))) add('cpf', 'CPF inválido')
  if (!/^\d{8}$/.test(billing.cep ?? '')) add('cep', 'CEP com 8 dígitos')
  if (blank(billing.street)) add('street', 'não deve estar em branco')
  if (blank(billing.number)) add('number', 'não deve estar em branco')
  if (blank(billing.neighborhood)) add('neighborhood', 'não deve estar em branco')
  if (blank(billing.city)) add('city', 'não deve estar em branco')
  if (!isValidUf(billing.state ?? '')) add('state', 'UF inválida')
  return errors
}

export const creditsHandlers = [
  http.get('*/api/credits/packages', async () => {
    await delay(150)
    if (!getSessionUser()) return unauthenticated()
    return HttpResponse.json(MOCK_PACKAGES)
  }),

  http.get('*/api/credits/balance', async () => {
    await delay(100)
    const user = getSessionUser()
    if (!user) return unauthenticated()
    return HttpResponse.json({ balance: getBalance(user.id) })
  }),

  http.post('*/api/credits/purchases', async ({ request }) => {
    await delay()
    const user = getSessionUser()
    if (!user) return unauthenticated()

    const idempotencyKey = request.headers.get('Idempotency-Key') ?? ''
    if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
      return problem(400, 'DADOS_INVALIDOS', 'Dados inválidos.', [
        { field: 'idempotencyKey', message: 'cabeçalho Idempotency-Key obrigatório' },
      ])
    }
    // Como no backend: a mesma chave do mesmo usuário devolve o pedido já criado, com 200.
    const repeated = [...payments.values()].find(
      (p) => p.userId === user.id && p.idempotencyKey === idempotencyKey,
    )
    if (repeated) return HttpResponse.json(publicPayment(repeated), { status: 200 })

    const body = (await request.json()) as PurchaseRequest
    const errors = billingErrors(body.billing)
    if (errors.length > 0) return problem(400, 'DADOS_INVALIDOS', 'Dados inválidos.', errors)

    const pkg = MOCK_PACKAGES.find((p) => p.id === body.packageId)
    if (!pkg) return problem(422, 'PACOTE_INDISPONIVEL', 'Pacote de créditos indisponível.')

    const id = mockPaymentId(nextPaymentId++)
    const payment: StoredPayment = {
      id,
      userId: user.id,
      idempotencyKey,
      packageId: pkg.id,
      packageName: pkg.name,
      method: body.method,
      status: 'PENDENTE',
      amount: pkg.price,
      credits: pkg.credits,
      createdAt: new Date().toISOString(),
    }
    if (body.method === 'PIX') {
      payment.pix = {
        qrCodeImage: PLACEHOLDER_QR_CODE,
        copyPaste: `PIX-FICTICIO-VERIDT-${id}-${pkg.price.toFixed(2)}`,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      }
    } else {
      // Como o provedor falso do backend: o "checkout" é a própria página de status do front.
      payment.checkoutUrl = `${window.location.origin}/creditos/pagamento/${id}`
    }
    payments.set(id, payment)
    return HttpResponse.json(publicPayment(payment), { status: 201 })
  }),

  http.get('*/api/credits/payments', async ({ request }) => {
    await delay(150)
    const user = getSessionUser()
    if (!user) return unauthenticated()
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Math.min(Number(url.searchParams.get('size') ?? 20), 50)
    const mine = [...payments.values()]
      .filter((p) => p.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const body: PaymentPage = {
      items: mine.slice(page * size, page * size + size).map(publicPayment),
      page,
      size,
      totalElements: mine.length,
      totalPages: Math.ceil(mine.length / size),
    }
    return HttpResponse.json(body)
  }),

  http.get('*/api/credits/payments/:id', async ({ params }) => {
    await delay(150)
    const user = getSessionUser()
    if (!user) return unauthenticated()
    const payment = payments.get(String(params.id))
    // Pedido de outro usuário: a mesma resposta de um ID inexistente.
    if (!payment || payment.userId !== user.id) return notFound()
    return HttpResponse.json(publicPayment(payment))
  }),

  http.post('*/api/credits/payments/:id/simulation', async ({ params, request }) => {
    await delay(150)
    const user = getSessionUser()
    if (!user) return unauthenticated()
    const payment = payments.get(String(params.id))
    if (!payment || payment.userId !== user.id) return notFound()
    const { approved } = (await request.json()) as PaymentSimulationRequest
    decideMockPayment(payment.id, approved)
    return HttpResponse.json(publicPayment(payment))
  }),
]
