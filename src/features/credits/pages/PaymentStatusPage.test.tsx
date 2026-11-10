import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import type { Payment } from '@/features/credits'
import { server } from '@/mocks/server'
import { renderRoutes } from '@/test/render'

import { PaymentStatusPage } from './PaymentStatusPage'

const routes = [{ path: '/creditos/pagamento/:pagamentoId', element: <PaymentStatusPage /> }]

const base: Payment = {
  id: 'pg-9',
  packageId: 'PREMIUM',
  method: 'MERCADO_PAGO',
  status: 'APPROVED',
  amount: 300,
  credits: 100,
  createdAt: '2026-11-10T10:00:00',
}

function mockPayment(payment: Payment | null) {
  server.use(
    http.get('*/api/credits/payments/:id', () =>
      payment
        ? HttpResponse.json(payment)
        : HttpResponse.json({ status: 404, title: 'Not Found' }, { status: 404 }),
    ),
  )
}

describe('PaymentStatusPage', () => {
  it('mostra o pagamento aprovado', async () => {
    mockPayment(base)
    renderRoutes(routes, '/creditos/pagamento/pg-9')

    expect(await screen.findByText('Pagamento aprovado')).toBeInTheDocument()
    expect(screen.getByText('Mercado Pago')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Novo registro' })).toHaveAttribute(
      'href',
      '/capturas/nova',
    )
  })

  it('oferece tentar de novo quando o pagamento é recusado', async () => {
    mockPayment({ ...base, status: 'REJECTED' })
    renderRoutes(routes, '/creditos/pagamento/pg-9')

    expect(await screen.findByText('Pagamento recusado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute(
      'href',
      '/creditos',
    )
  })

  it('avisa quando o pagamento não existe', async () => {
    mockPayment(null)
    renderRoutes(routes, '/creditos/pagamento/nao-existe')

    expect(await screen.findByText('Pagamento não encontrado.')).toBeInTheDocument()
  })
})
