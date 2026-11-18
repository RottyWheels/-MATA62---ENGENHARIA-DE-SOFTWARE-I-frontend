import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import type { Payment } from '@/features/credits'
import { server } from '@/mocks/server'
import { http as api } from '@/shared/api/http'
import { renderRoutes } from '@/test/render'
import { loginAsDemo, sessionBalance } from '@/test/session'

import { PaymentStatusPage } from './PaymentStatusPage'

const routes = [{ path: '/creditos/pagamento/:pagamentoId', element: <PaymentStatusPage /> }]

const base: Payment = {
  id: 'pg-9',
  packageId: 'PREMIUM',
  packageName: 'Premium',
  method: 'MERCADO_PAGO',
  status: 'APROVADO',
  amount: 400,
  credits: 100,
  createdAt: '2026-11-10T10:00:00Z',
  decidedAt: '2026-11-10T10:05:00Z',
  checkoutUrl: 'http://localhost:3000/creditos/pagamento/pg-9',
}

function mockPayment(payment: unknown) {
  server.use(
    http.get('*/api/credits/payments/:id', () =>
      payment
        ? HttpResponse.json(payment)
        : HttpResponse.json(
            { status: 404, code: 'PAGAMENTO_NAO_ENCONTRADO', message: 'Pagamento não encontrado.' },
            { status: 404 },
          ),
    ),
  )
}

/** Cria um Pix pendente de verdade nos mocks e devolve o ID. */
async function createPendingPix() {
  await loginAsDemo()
  const { data } = await api.post<Payment>(
    '/credits/purchases',
    {
      packageId: 'MEDIO',
      method: 'PIX',
      billing: {
        fullName: 'Usuária Demo',
        email: 'demo@veridt.test',
        phone: '71998765432',
        cpf: '52998224725',
        cep: '40170115',
        street: 'Av. Adhemar de Barros',
        number: '500',
        neighborhood: 'Ondina',
        city: 'Salvador',
        state: 'BA',
      },
    },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return data
}

describe('PaymentStatusPage', () => {
  it('mostra o pagamento aprovado, com o pacote e a data da decisão', async () => {
    mockPayment(base)
    renderRoutes(routes, '/creditos/pagamento/pg-9')

    expect(await screen.findByText('Pagamento aprovado')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByText('Mercado Pago')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Aprovado em')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Novo registro' })).toHaveAttribute(
      'href',
      '/capturas/nova',
    )
  })

  it('oferece tentar de novo quando o pagamento é recusado', async () => {
    mockPayment({ ...base, status: 'RECUSADO' })
    renderRoutes(routes, '/creditos/pagamento/pg-9')

    expect(await screen.findByText('Pagamento recusado')).toBeInTheDocument()
    expect(screen.getByText('Recusado em')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute(
      'href',
      '/creditos',
    )
  })

  it('pendente: continua consultando e mostra o Pix fictício', async () => {
    const { decidedAt: _decidedAt, checkoutUrl: _checkoutUrl, ...rest } = base
    mockPayment({
      ...rest,
      method: 'PIX',
      status: 'PENDENTE',
      pix: {
        qrCodeImage: 'data:image/png;base64,iVBORw0KGgo=',
        copyPaste: 'PIX-FICTICIO-VERIDT-pg-9-400.00',
        expiresAt: '2026-11-10T10:30:00Z',
      },
    })
    renderRoutes(routes, '/creditos/pagamento/pg-9')

    expect(await screen.findByText('Aguardando pagamento')).toBeInTheDocument()
    expect(screen.getByLabelText<HTMLInputElement>('Pix copia e cola').value).toBe(
      'PIX-FICTICIO-VERIDT-pg-9-400.00',
    )
    expect(screen.queryByText(/Aprovado em|Recusado em/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('um status desconhecido não quebra a página', async () => {
    mockPayment({ ...base, status: 'ESTORNADO', method: 'BOLETO' })
    renderRoutes(routes, '/creditos/pagamento/pg-9')

    expect(await screen.findByText('Pagamento em verificação')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByText('BOLETO')).toBeInTheDocument()
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument()
  })

  it('avisa quando o pagamento não existe ou é de outro usuário (404)', async () => {
    mockPayment(null)
    renderRoutes(routes, '/creditos/pagamento/nao-existe')

    expect(await screen.findByText('Pagamento não encontrado.')).toBeInTheDocument()
  })

  it('sem VITE_ENABLE_PAYMENT_SIMULATION, não mostra "Simular pagamento"', async () => {
    vi.stubEnv('VITE_ENABLE_PAYMENT_SIMULATION', 'false')
    const payment = await createPendingPix()
    renderRoutes(routes, `/creditos/pagamento/${payment.id}`)

    expect(await screen.findByText('Aguardando pagamento')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simular aprovação' })).not.toBeInTheDocument()
  })

  it('"Simular aprovação": o polling vê o APROVADO e o saldo sobe', async () => {
    vi.stubEnv('VITE_ENABLE_PAYMENT_SIMULATION', 'true')
    const payment = await createPendingPix()
    const { user, queryClient } = renderRoutes(routes, `/creditos/pagamento/${payment.id}`)
    const before = await sessionBalance()
    queryClient.setQueryData(['credits', 'balance'], { balance: before })
    queryClient.setQueryData(['me'], { id: 'x' })

    await user.click(await screen.findByRole('button', { name: 'Simular aprovação' }))

    expect(await screen.findByText('Pagamento aprovado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simular aprovação' })).not.toBeInTheDocument()
    expect(await sessionBalance()).toBe(before + payment.credits)
    // O saldo é recarregado pela query própria, e não pela de `/api/me`.
    expect(queryClient.getQueryState(['credits', 'balance'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['me'])?.isInvalidated).toBe(false)
  })

  it('"Simular recusa" leva ao pagamento recusado, sem créditos', async () => {
    vi.stubEnv('VITE_ENABLE_PAYMENT_SIMULATION', 'true')
    const payment = await createPendingPix()
    const { user } = renderRoutes(routes, `/creditos/pagamento/${payment.id}`)
    const before = await sessionBalance()

    await user.click(await screen.findByRole('button', { name: 'Simular recusa' }))

    expect(await screen.findByText('Pagamento recusado')).toBeInTheDocument()
    expect(await sessionBalance()).toBe(before)
  })

  it('simulação desligada no backend (404): avisa, sem quebrar', async () => {
    vi.stubEnv('VITE_ENABLE_PAYMENT_SIMULATION', 'true')
    const payment = await createPendingPix()
    server.use(
      http.post('*/api/credits/payments/:id/simulation', () =>
        HttpResponse.json({ status: 404, code: 'NAO_ENCONTRADO' }, { status: 404 }),
      ),
    )
    const { user } = renderRoutes(routes, `/creditos/pagamento/${payment.id}`)

    await user.click(await screen.findByRole('button', { name: 'Simular aprovação' }))

    expect(await screen.findByText(/PAYMENT_SIMULATION_ENABLED=true/)).toBeInTheDocument()
    expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
  })
})
