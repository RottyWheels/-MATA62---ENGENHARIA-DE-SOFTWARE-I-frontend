import { delay, http, HttpResponse } from 'msw'

import type { CreditPackage, Payment, PurchaseRequest } from '@/features/credits'

import { problem } from '../utils'
import { addCredits, getSessionUser } from './auth'

/**
 * Backend de créditos em memória. Os pagamentos são aprovados sozinhos depois de
 * {@link MOCK_APPROVAL_MS} (Pix) para simular a confirmação do Mercado Pago.
 */

export const MOCK_PACKAGES: CreditPackage[] = [
  {
    id: 'BASICO',
    name: 'Pacote Básico',
    credits: 10,
    pricePerCredit: 5,
    price: 50,
    description: 'Ideal para poucas ocorrências.',
  },
  {
    id: 'MEDIO',
    name: 'Pacote Médio',
    credits: 30,
    pricePerCredit: 4,
    price: 120,
    description: 'Para uso frequente.',
  },
  {
    id: 'PREMIUM',
    name: 'Pacote Premium',
    credits: 100,
    pricePerCredit: 3,
    price: 300,
    description: 'Para quem realiza muitos registros.',
  },
]

/** Tempo até o pagamento simulado ser aprovado. */
export const MOCK_APPROVAL_MS = 6_000

type StoredPayment = Payment & { userId: string; idempotencyKey: string }

const payments = new Map<string, StoredPayment>()
let nextPaymentId = 1

export function resetCreditsMock() {
  payments.clear()
  nextPaymentId = 1
}

/** Aprova na hora um pagamento pendente (útil em testes). */
export function approveMockPayment(id: string) {
  const payment = payments.get(id)
  if (!payment || payment.status !== 'PENDING') return
  payment.status = 'APPROVED'
  addCredits(payment.userId, payment.credits)
}

function settle(payment: StoredPayment) {
  if (
    payment.status === 'PENDING' &&
    Date.now() - Date.parse(payment.createdAt) >= MOCK_APPROVAL_MS
  ) {
    approveMockPayment(payment.id)
  }
}

function publicPayment({ userId: _u, idempotencyKey: _k, ...payment }: StoredPayment): Payment {
  return payment
}

/** QR Code ilustrativo (não é um Pix válido): SVG com padrão pseudoaleatório. */
function fakeQrCode(seed: string) {
  const size = 25
  let state = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
  const rand = () => (state = (state * 1103515245 + 12345) >>> 0) / 2 ** 32
  const finder = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`
  let cells = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder = (x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9)
      if (!inFinder && rand() > 0.5) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${size + 4} ${size + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${size + 4}" height="${size + 4}" fill="#fff"/>${finder(0, 0)}${finder(size - 7, 0)}${finder(0, size - 7)}${cells}</svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export const creditsHandlers = [
  http.get('*/api/credits/packages', async () => {
    await delay(150)
    if (!getSessionUser()) return problem(401, 'Unauthorized')
    return HttpResponse.json(MOCK_PACKAGES)
  }),

  http.post('*/api/credits/purchases', async ({ request }) => {
    await delay()
    const user = getSessionUser()
    if (!user) return problem(401, 'Unauthorized')

    const idempotencyKey = request.headers.get('Idempotency-Key') ?? ''
    const repeated = [...payments.values()].find((p) => p.idempotencyKey === idempotencyKey)
    if (idempotencyKey && repeated) return HttpResponse.json(publicPayment(repeated))

    const body = (await request.json()) as PurchaseRequest
    const pkg = MOCK_PACKAGES.find((p) => p.id === body.packageId)
    if (!pkg) {
      return problem(400, 'Bad Request', 'Pacote inválido.', [
        { field: 'packageId', message: 'Escolha um pacote.' },
      ])
    }

    const id = `pg-${nextPaymentId++}`
    const createdAt = new Date().toISOString()
    const payment: StoredPayment = {
      id,
      userId: user.id,
      idempotencyKey,
      packageId: pkg.id,
      method: body.method,
      status: 'PENDING',
      amount: pkg.price,
      credits: pkg.credits,
      createdAt,
    }
    if (body.method === 'PIX') {
      payment.pix = {
        qrCodeImage: fakeQrCode(id + createdAt),
        copyPaste: `00020126580014BR.GOV.BCB.PIX0136veridt-mock-${id}5204000053039865406${pkg.price.toFixed(2)}5802BR5906VERIDT6006SALVADOR62070503***6304ABCD`,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      }
    } else {
      // No real, o backend devolve o `init_point` do Checkout Pro do Mercado Pago.
      // Aqui simulamos o retorno direto para a página de status.
      payment.checkoutUrl = `/creditos/pagamento/${id}`
    }
    payments.set(id, payment)
    return HttpResponse.json(publicPayment(payment), { status: 201 })
  }),

  http.get('*/api/credits/payments/:id', async ({ params }) => {
    await delay(150)
    const user = getSessionUser()
    if (!user) return problem(401, 'Unauthorized')
    const payment = payments.get(String(params.id))
    if (!payment || payment.userId !== user.id) {
      return problem(404, 'Not Found', 'Pagamento não encontrado.')
    }
    settle(payment)
    return HttpResponse.json(publicPayment(payment))
  }),
]
