import { expect, test, type Page } from '@playwright/test'

// Confirmação de e-mail contra os mocks. A conta `pendente@veridt.test` já vem cadastrada sem
// confirmação, e o token `token-de-confirmacao` a confirma (ver src/mocks/handlers/auth.ts).
const PENDING = { email: 'pendente@veridt.test', password: 'senha-pendente-123' }
const PENDING_TOKEN = 'token-de-confirmacao'

async function login(page: Page, email: string, password: string) {
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

async function expectNoHorizontalScroll(page: Page, screen: string) {
  // Expressão em texto: a pasta e2e é compilada sem os tipos do navegador (DOM).
  const widths = await page.evaluate<{ page: number; viewport: number }>(
    '({ page: document.documentElement.scrollWidth, viewport: window.innerWidth })',
  )
  expect(widths.page, `rolagem lateral em ${screen}`).toBeLessThanOrEqual(widths.viewport)
}

test('login sem e-mail confirmado: aviso, reenvio e botão bloqueado por 60 s', async ({ page }) => {
  await page.goto('/login')
  await login(page, PENDING.email, PENDING.password)

  const notice = page.getByRole('alert').filter({ hasText: 'Confirme seu e-mail antes de entrar' })
  await expect(notice).toBeFocused()
  await expect(notice).toContainText(PENDING.email)
  // Nem o toast de CSRF, nem a sessão.
  await expect(page.getByText('Acesso negado')).toBeHidden()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByRole('button', { name: 'Reenviar e-mail' }).click()
  await expect(page.getByText(/Se houver uma conta pendente com esse e-mail/)).toBeFocused()
  await expect(page.getByRole('button', { name: /Reenviar e-mail \(\d+ s\)/ })).toBeDisabled()
})

test('link de confirmação → e-mail confirmado → login liberado', async ({ page }) => {
  const confirmRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/email-confirmation/confirm')) {
      confirmRequests.push(request.method())
    }
  })
  await page.goto(`/confirmar-email?token=${PENDING_TOKEN}`)

  await expect(page.getByRole('status').filter({ hasText: 'E-mail confirmado' })).toBeFocused()
  await expect(page).toHaveURL(/\/confirmar-email$/)
  // Um POST só, mesmo com o StrictMode do `pnpm dev`, e nunca um GET.
  expect(confirmRequests).toEqual(['POST'])

  await page.getByRole('link', { name: 'Ir para o login' }).click()
  await login(page, PENDING.email, PENDING.password)
  await expect(page).toHaveURL(/\/registros$/)
})

test('link inválido pelo teclado: o foco vai para a mensagem e o reenvio funciona com Enter', async ({
  page,
}) => {
  await page.goto('/confirmar-email?token=nao-existe')

  const alert = page.getByRole('alert').filter({ hasText: 'Link inválido ou expirado' })
  await expect(alert).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(page.getByLabel('E-mail')).toBeFocused()
  await page.keyboard.type(PENDING.email)
  await page.keyboard.press('Enter')

  await expect(page.getByText(/Se houver uma conta pendente com esse e-mail/)).toBeFocused()
})

test.describe('celular (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('as telas da confirmação cabem sem rolar para o lado', async ({ page }) => {
    await page.goto('/confirmar-email?token=nao-existe')
    await expect(page.getByText('Link inválido ou expirado')).toBeVisible()
    await expectNoHorizontalScroll(page, 'link inválido')

    await page.goto('/login')
    await login(page, PENDING.email, PENDING.password)
    await expect(page.getByText('Confirme seu e-mail antes de entrar')).toBeVisible()
    await page.getByRole('button', { name: 'Reenviar e-mail' }).click()
    await expect(page.getByText(/Se houver uma conta pendente/)).toBeVisible()
    await expectNoHorizontalScroll(page, 'login com e-mail não confirmado')

    await page.goto(`/confirmar-email?token=${PENDING_TOKEN}`)
    await expect(page.getByText('E-mail confirmado')).toBeVisible()
    await expectNoHorizontalScroll(page, 'e-mail confirmado')

    await page.goto('/cadastro')
    await page.getByLabel('Nome completo').fill('Pessoa Celular')
    await page
      .getByLabel('E-mail')
      .fill(`celular-com-um-endereco-bem-comprido-${Date.now()}@veridt.test`)
    await page.getByLabel('CPF').pressSequentially('11144477735')
    await page.getByLabel('Senha', { exact: true }).fill('Senha#Forte1')
    await page.getByLabel('Confirmar senha').fill('Senha#Forte1')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible()
    await expectNoHorizontalScroll(page, 'confirme seu e-mail')
  })
})
