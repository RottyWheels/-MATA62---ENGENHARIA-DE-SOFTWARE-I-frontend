import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { approveMockPayment, MOCK_PACKAGES } from '@/mocks/handlers/credits'
import { server } from '@/mocks/server'
import { renderRoutes } from '@/test/render'
import { loginAsDemo } from '@/test/session'

import { PurchasePage } from './PurchasePage'

const routes = [
  { path: '/creditos', element: <PurchasePage /> },
  { path: '/creditos/checkout/:pacoteId', element: <PurchasePage /> },
  { path: '/creditos/pagamento/:pagamentoId', element: <p>status do pagamento</p> },
]

async function fillBilling(user: ReturnType<typeof renderRoutes>['user']) {
  await user.type(screen.getByLabelText('Telefone'), '71998765432')
  await user.type(screen.getByLabelText('CEP'), '40170115')
  await user.type(screen.getByLabelText('Endereço'), 'Av. Adhemar de Barros')
  await user.type(screen.getByLabelText('Número'), '500')
  await user.type(screen.getByLabelText('Bairro'), 'Ondina')
  await user.type(screen.getByLabelText('Cidade'), 'Salvador')
  await user.click(screen.getByRole('combobox', { name: 'Estado' }))
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Bahia (BA)' }))
}

describe('PurchasePage', () => {
  beforeEach(async () => {
    await loginAsDemo()
  })

  it('mostra os pacotes e pré-preenche nome, e-mail e CPF da conta', async () => {
    renderRoutes(routes, '/creditos')

    for (const pkg of MOCK_PACKAGES) {
      expect(await screen.findByRole('heading', { name: pkg.name })).toBeInTheDocument()
    }
    expect(screen.getByText('Saldo de créditos atual: 10')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).toHaveValue('Usuária Demo'))
    expect(screen.getByLabelText('E-mail')).toHaveValue('demo@veridt.test')
    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25')
  })

  it('exige pacote e dados de faturamento antes de pagar', async () => {
    const { user } = renderRoutes(routes, '/creditos')
    await screen.findByRole('heading', { name: 'Pacote Básico' })

    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))

    expect(await screen.findByText('Escolha um pacote.')).toBeInTheDocument()
    expect(screen.getByText('Informe o telefone.')).toBeInTheDocument()
    expect(screen.getByText('Selecione o estado.')).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('aria-invalid', 'true')
  })

  it('/creditos/checkout/:pacoteId já chega com o pacote escolhido', async () => {
    renderRoutes(routes, '/creditos/checkout/premium')

    expect(
      await screen.findByRole('button', { name: 'Selecionado: Pacote Premium' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('gera o Pix, envia Idempotency-Key e mostra a aprovação', async () => {
    let idempotencyKey: string | null = null
    let body: unknown
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/api/credits/purchases')) {
        idempotencyKey = request.headers.get('Idempotency-Key')
        void request
          .clone()
          .json()
          .then((json) => (body = json))
      }
    })

    const { user } = renderRoutes(routes, '/creditos')
    await user.click(await screen.findByRole('button', { name: 'Escolher: Pacote Médio' }))
    await fillBilling(user)
    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))

    const dialog = await screen.findByRole('dialog', { name: 'PIX Gerado' })
    expect(within(dialog).getByRole('img', { name: /QR Code Pix de R\$/ })).toBeInTheDocument()
    expect(within(dialog).getByLabelText<HTMLInputElement>('Pix copia e cola').value).toContain(
      'BR.GOV.BCB.PIX',
    )
    expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(body).toMatchObject({
      packageId: 'MEDIO',
      method: 'PIX',
      billing: { phone: '71998765432', cep: '40170115', cpf: '52998224725', state: 'BA' },
    })

    approveMockPayment('pg-1')
    expect(
      await within(dialog).findByText('Pagamento aprovado', {}, { timeout: 6000 }),
    ).toBeInTheDocument()
    server.events.removeAllListeners()
  }, 15_000)

  it('Mercado Pago leva à página de status do pagamento', async () => {
    const { user } = renderRoutes(routes, '/creditos/checkout/basico')
    await screen.findByRole('button', { name: 'Selecionado: Pacote Básico' })
    await fillBilling(user)
    await user.click(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }))

    expect(await screen.findByText('status do pagamento')).toBeInTheDocument()
  })

  it('mostra erros do backend no formulário', async () => {
    server.use(
      http.post('*/api/credits/purchases', () =>
        HttpResponse.json(
          {
            status: 400,
            title: 'Bad Request',
            detail: 'Verifique os dados de faturamento.',
            errors: [{ field: 'billing.cep', message: 'CEP não encontrado.' }],
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const { user } = renderRoutes(routes, '/creditos/checkout/basico')
    await screen.findByRole('button', { name: 'Selecionado: Pacote Básico' })
    await fillBilling(user)
    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))

    expect(await screen.findByText('CEP não encontrado.')).toBeInTheDocument()
    expect(screen.getByText('Verifique os dados de faturamento.')).toBeInTheDocument()
    expect(screen.getByLabelText('CEP')).toHaveAttribute('aria-invalid', 'true')
  })
})
