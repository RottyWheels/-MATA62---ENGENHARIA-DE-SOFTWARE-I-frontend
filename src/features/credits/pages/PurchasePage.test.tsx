import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { decideMockPayment, MOCK_PACKAGES, mockPaymentId } from '@/mocks/handlers/credits'
import { server } from '@/mocks/server'
import { http as api } from '@/shared/api/http'
import { renderRoutes } from '@/test/render'
import { loginAsDemo } from '@/test/session'

import { PurchasePage } from './PurchasePage'

const routes = [
  { path: '/creditos', element: <PurchasePage /> },
  { path: '/creditos/checkout/:pacoteId', element: <PurchasePage /> },
  { path: '/creditos/pagamento/:pagamentoId', element: <p>status do pagamento</p> },
]

type User = ReturnType<typeof renderRoutes>['user']

async function fillBilling(user: User) {
  await user.type(screen.getByLabelText('CPF'), '52998224725')
  await user.type(screen.getByLabelText('Telefone'), '71998765432')
  await user.type(screen.getByLabelText('CEP'), '40170115')
  await user.type(screen.getByLabelText('Endereço'), 'Av. Adhemar de Barros')
  await user.type(screen.getByLabelText('Número'), '500')
  await user.type(screen.getByLabelText('Bairro'), 'Ondina')
  await user.type(screen.getByLabelText('Cidade'), 'Salvador')
  await user.click(screen.getByRole('combobox', { name: 'Estado' }))
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Bahia (BA)' }))
}

/** Guarda a `Idempotency-Key` e o corpo de cada `POST /api/credits/purchases`. */
function spyPurchases() {
  const calls: { key: string | null; body: unknown }[] = []
  server.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith('/api/credits/purchases')) {
      calls.push({
        key: request.headers.get('Idempotency-Key'),
        body: await request.clone().json(),
      })
    }
  })
  return calls
}

const BILLING = {
  fullName: 'Usuária Demo',
  email: 'demo@veridt.test',
  phone: '71998765432',
  cpf: '529.982.247-25',
  cep: '40170115',
  street: 'Av. Adhemar de Barros',
  number: '500',
  neighborhood: 'Ondina',
  city: 'Salvador',
  state: 'BA',
}

describe('PurchasePage', () => {
  beforeEach(async () => {
    await loginAsDemo()
  })

  afterEach(() => server.events.removeAllListeners())

  it('mostra os pacotes, o saldo de /api/credits/balance e pré-preenche nome e e-mail', async () => {
    renderRoutes(routes, '/creditos')

    for (const pkg of MOCK_PACKAGES) {
      expect(await screen.findByRole('heading', { name: pkg.name })).toBeInTheDocument()
    }
    expect(await screen.findByText('Saldo de créditos atual: 10')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).toHaveValue('Usuária Demo'))
    expect(screen.getByLabelText('E-mail')).toHaveValue('demo@veridt.test')
    // O backend não devolve o CPF em /api/me: o usuário digita.
    expect(screen.getByLabelText('CPF')).toHaveValue('')
    expect(screen.getByLabelText('CPF')).not.toHaveAttribute('readonly')
  })

  it('exige pacote e dados de faturamento antes de pagar', async () => {
    const { user } = renderRoutes(routes, '/creditos')
    await screen.findByRole('heading', { name: 'Básico' })

    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))

    expect(await screen.findByText('Escolha um pacote.')).toBeInTheDocument()
    expect(screen.getByText('Informe o telefone.')).toBeInTheDocument()
    expect(screen.getByText('Selecione o estado.')).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('aria-invalid', 'true')
  })

  it('/creditos/checkout/:pacoteId já chega com o pacote escolhido', async () => {
    renderRoutes(routes, '/creditos/checkout/premium')

    expect(await screen.findByRole('button', { name: 'Selecionado: Premium' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('gera o Pix (fictício), envia Idempotency-Key e mostra a aprovação com o saldo novo', async () => {
    const calls = spyPurchases()
    const { user } = renderRoutes(routes, '/creditos')
    await user.click(await screen.findByRole('button', { name: 'Escolher: Médio' }))
    await fillBilling(user)
    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))

    const dialog = await screen.findByRole('dialog', { name: 'PIX Gerado' })
    expect(within(dialog).getByRole('img', { name: /QR Code Pix de R\$/ })).toBeInTheDocument()
    expect(within(dialog).getByLabelText<HTMLInputElement>('Pix copia e cola').value).toMatch(
      /^PIX-FICTICIO-VERIDT-/,
    )
    expect(within(dialog).getByText('Aguardando pagamento')).toBeInTheDocument()
    expect(calls[0]?.key).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[0]?.body).toMatchObject({
      packageId: 'MEDIO',
      method: 'PIX',
      billing: { phone: '71998765432', cep: '40170115', cpf: '52998224725', state: 'BA' },
    })

    decideMockPayment(mockPaymentId(1), true)
    expect(
      await within(dialog).findByText('Pagamento aprovado', {}, { timeout: 6000 }),
    ).toBeInTheDocument()
    // 10 do usuário de demonstração + 50 do pacote Médio.
    expect(await screen.findByText('Saldo de créditos atual: 60')).toBeInTheDocument()
  }, 15_000)

  it('repetir o mesmo pedido (ex.: após falha de rede) reusa a chave; outro pedido ganha outra', async () => {
    const calls = spyPurchases()
    server.use(http.post('*/api/credits/purchases', () => HttpResponse.error(), { once: true }))
    const { user } = renderRoutes(routes, '/creditos/checkout/basico')
    await screen.findByRole('button', { name: 'Selecionado: Básico' })
    await fillBilling(user)

    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))
    await screen.findByRole('dialog', { name: 'PIX Gerado' })
    expect(calls[1]?.key).toBe(calls[0]?.key)

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Escolher: Premium' }))
    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))
    await screen.findByRole('dialog', { name: 'PIX Gerado' })
    expect(calls[2]?.key).not.toBe(calls[0]?.key)
  })

  it('Mercado Pago leva à página de status (checkoutUrl absoluta da mesma origem)', async () => {
    const { user, router } = renderRoutes(routes, '/creditos/checkout/basico')
    await screen.findByRole('button', { name: 'Selecionado: Básico' })
    await fillBilling(user)
    await user.click(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }))

    expect(await screen.findByText('status do pagamento')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/creditos/pagamento/${mockPaymentId(1)}`)
  })

  it('pacote indisponível (422): mostra o erro no pacote', async () => {
    server.use(
      http.post('*/api/credits/purchases', () =>
        HttpResponse.json(
          {
            status: 422,
            code: 'PACOTE_INDISPONIVEL',
            message: 'Pacote de créditos indisponível.',
            errors: [],
          },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderRoutes(routes, '/creditos/checkout/basico')
    await screen.findByRole('button', { name: 'Selecionado: Básico' })
    await fillBilling(user)
    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))

    expect(await screen.findAllByText('Pacote de créditos indisponível.')).toHaveLength(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('leva os erros de faturamento (400, billing.*) para os campos', async () => {
    server.use(
      http.post('*/api/credits/purchases', () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'DADOS_INVALIDOS',
            message: 'Dados inválidos.',
            errors: [
              { field: 'billing.cep', message: 'CEP com 8 dígitos' },
              { field: 'billing.phone', message: 'Telefone com DDD, só dígitos' },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoutes(routes, '/creditos/checkout/basico')
    await screen.findByRole('button', { name: 'Selecionado: Básico' })
    await fillBilling(user)
    await user.click(screen.getByRole('button', { name: 'Pagar com PIX' }))

    expect(await screen.findByText('CEP com 8 dígitos')).toBeInTheDocument()
    expect(screen.getByText('Dados inválidos.')).toBeInTheDocument()
    expect(screen.getByLabelText('CEP')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('API de compra (mocks iguais ao backend)', () => {
  beforeEach(async () => {
    await loginAsDemo()
  })

  const purchase = (key?: string, packageId = 'MEDIO') =>
    api.post(
      '/credits/purchases',
      { packageId, method: 'PIX', billing: BILLING },
      { headers: key ? { 'Idempotency-Key': key } : {}, skipGlobalErrorHandler: true },
    )

  it('a mesma chave devolve o mesmo pedido: 201 na primeira vez, 200 depois', async () => {
    const first = await purchase('chave-1')
    const again = await purchase('chave-1')

    expect(first.status).toBe(201)
    expect(again.status).toBe(200)
    expect(again.data).toEqual(first.data)
  })

  it('sem Idempotency-Key responde 400; pacote inexistente responde 422', async () => {
    await expect(purchase()).rejects.toMatchObject({ response: { status: 400 } })
    await expect(purchase('chave-2', 'GOLD')).rejects.toMatchObject({
      response: { status: 422, data: { code: 'PACOTE_INDISPONIVEL' } },
    })
  })

  it('o pedido não traz faturamento e os campos ausentes não vêm no JSON', async () => {
    const { data } = await purchase('chave-3')

    expect(data).not.toHaveProperty('billing')
    expect(data).not.toHaveProperty('checkoutUrl')
    expect(data).not.toHaveProperty('decidedAt')
    expect(data).toMatchObject({ status: 'PENDENTE', packageName: 'Médio', amount: 225 })
  })
})
