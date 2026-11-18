import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Backend real (ver e2e/playwright.real.config.ts): cadastro → link do Mailpit → login → Pix →
// "Simular aprovação" → status aprovado → saldo sobe → e-mail "Compra de créditos confirmada".
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025'

/** CPF válido e aleatório: o backend não aceita o mesmo CPF em duas contas. */
function randomCpf() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  for (const length of [9, 10]) {
    const sum = digits.reduce((acc, d, i) => acc + d * (length + 1 - i), 0)
    digits.push(((sum * 10) % 11) % 10)
  }
  return digits.join('')
}

type MailpitMessage = { ID: string; Subject: string }

/** Espera o e-mail com este assunto chegar para o endereço e devolve o corpo em texto. */
async function waitForEmail(request: APIRequestContext, to: string, subject: string) {
  let found: MailpitMessage | undefined
  await expect
    .poll(
      async () => {
        const response = await request.get(`${MAILPIT}/api/v1/search`, {
          params: { query: `to:"${to}"` },
        })
        const { messages } = (await response.json()) as { messages: MailpitMessage[] }
        found = messages.find((m) => m.Subject.includes(subject))
        return !!found
      },
      { message: `e-mail "${subject}" para ${to}`, timeout: 30_000 },
    )
    .toBe(true)
  const message = await request.get(`${MAILPIT}/api/v1/message/${found?.ID ?? ''}`)
  const { Text, HTML } = (await message.json()) as { Text: string; HTML: string }
  return `${Text}\n${HTML}`
}

async function fillBilling(page: Page) {
  await page.getByLabel('CPF').pressSequentially('52998224725')
  await page.getByLabel('Telefone').pressSequentially('71998765432')
  await page.getByLabel('CEP').pressSequentially('40170115')
  await page.getByLabel('Endereço').fill('Av. Adhemar de Barros')
  await page.getByLabel('Número').fill('500')
  await page.getByLabel('Bairro').fill('Ondina')
  await page.getByLabel('Cidade').fill('Salvador')
  await page.getByRole('combobox', { name: 'Estado' }).click()
  await page.getByRole('option', { name: 'Bahia (BA)' }).click()
}

test('comprar Pix, simular a aprovação, ver "aprovado" e o saldo subir', async ({
  page,
  request,
}) => {
  const email = `e2e-creditos-${Date.now()}@veridt.test`
  const password = 'Senha#Forte1'

  // Cadastro e confirmação do e-mail pelo link que chegou no Mailpit.
  await page.goto('/cadastro')
  await page.getByLabel('Nome completo').fill('Pessoa E2E Créditos')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('CPF').pressSequentially(randomCpf())
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible()

  const confirmation = await waitForEmail(request, email, 'Confirm')
  const token = /confirmar-email\?token=([\w-]+)/.exec(confirmation)?.[1]
  expect(token, 'token no e-mail de confirmação').toBeTruthy()
  // O link do e-mail aponta para o CONFIRMATION_URL do backend; abrimos o mesmo token aqui.
  await page.goto(`/confirmar-email?token=${token ?? ''}`)
  await expect(page.getByText('E-mail confirmado')).toBeVisible()

  // Login e tela de compra, com o saldo de /api/credits/balance.
  await page.goto('/login?redirect=%2Fcreditos')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Compra de Créditos' })).toBeVisible()
  await expect(page.getByText('Saldo de créditos atual: 0')).toBeVisible()
  await expect(page.getByTestId('saldo-creditos')).toHaveText('Créditos: 0')

  // Pix do pacote Médio (valores do backend), com o QR Code e o copia-e-cola fictícios.
  await page.getByRole('button', { name: 'Escolher: Médio' }).click()
  await fillBilling(page)
  await page.getByRole('button', { name: 'Pagar com PIX' }).click()

  const dialog = page.getByRole('dialog', { name: 'PIX Gerado' })
  await expect(dialog.getByText('Aguardando pagamento')).toBeVisible()
  await expect(dialog.getByRole('img', { name: /QR Code Pix/ })).toBeVisible()
  await expect(dialog.getByLabel('Pix copia e cola')).toHaveValue(/^PIX-FICTICIO-VERIDT-/)

  // Simulação: o polling vê APROVADO e o saldo é recarregado.
  await dialog.getByRole('button', { name: 'Simular aprovação' }).click()
  await expect(dialog.getByText('Pagamento aprovado')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('saldo-creditos')).toHaveText('Créditos: 50')
  await expect(page.getByText('Saldo de créditos atual: 50')).toBeVisible()

  await waitForEmail(request, email, 'Compra de créditos confirmada')
})
