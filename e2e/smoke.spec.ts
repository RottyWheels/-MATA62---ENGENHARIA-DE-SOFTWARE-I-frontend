import { expect, test, type Page } from '@playwright/test'

// Roda com VITE_ENABLE_MOCKS=true (ver e2e/playwright.config.ts): o MSW faz o papel do backend.

test('rota protegida sem sessão vai para o login com redirect', async ({ page }) => {
  await page.goto('/registros')

  await expect(page).toHaveURL(/\/login\?redirect=%2Fregistros$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()
})

/**
 * Guarda os links de confirmação que os mocks "enviam": sem servidor de e-mail, o mock do
 * cadastro imprime o link no console do navegador, no papel do Mailpit.
 */
function captureConfirmationLinks(page: Page) {
  const links: string[] = []
  page.on('console', (message) => {
    const match = /\/confirmar-email\?token=[\w-]+/.exec(message.text())
    if (match) links.push(match[0])
  })
  return links
}

/**
 * Abre um caminho dentro do app sem recarregar a página (recarregar apaga o estado dos mocks),
 * como se o link do e-mail fosse aberto na mesma aba.
 */
async function openInApp(page: Page, path: string) {
  await page.evaluate(
    `history.pushState(null, '', ${JSON.stringify(path)}); dispatchEvent(new PopStateEvent('popstate'))`,
  )
}

test('cadastrar → confirmar o e-mail → logar → ver o layout autenticado → sair', async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@veridt.test`
  const password = 'senha-e2e-123'
  const links = captureConfirmationLinks(page)

  // Cadastro (usuário comum)
  await page.goto('/cadastro')
  await page.getByLabel('Nome completo').fill('Pessoa Teste E2E')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('CPF').pressSequentially('11144477735')
  await expect(page.getByLabel('CPF')).toHaveValue('111.444.777-35')
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)
  await page.getByRole('button', { name: 'Criar conta' }).click()

  // Sem login automático: a tela pede a confirmação do e-mail
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible()
  const notice = page.getByRole('status').filter({ hasText: 'Falta confirmar o e-mail' })
  await expect(notice).toContainText(email)
  await expect(notice).toContainText('24 horas')
  await expect(notice).toBeFocused()

  // Abre o link "recebido" por e-mail
  await expect.poll(() => links.length).toBe(1)
  await openInApp(page, links[0] ?? '')
  await expect(page.getByText('E-mail confirmado')).toBeVisible()
  // O token sai da URL e do histórico.
  await expect(page).toHaveURL(/\/confirmar-email$/)

  // Login
  await page.getByRole('link', { name: 'Ir para o login' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Layout autenticado
  await expect(page).toHaveURL(/\/registros$/)
  await expect(page.getByRole('heading', { name: 'Listagem dos Registros' })).toBeVisible()
  await expect(page.getByTestId('saldo-creditos')).toHaveText('Créditos: 0')
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()

  // Nada de sessão no storage
  const storage = await page.evaluate(() => [localStorage.length, sessionStorage.length])
  expect(storage).toEqual([0, 0])

  // Sair
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // Sem sessão de novo
  await page.goto('/creditos')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcreditos$/)
})
