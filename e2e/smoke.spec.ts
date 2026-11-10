import { expect, test } from '@playwright/test'

// Roda com VITE_ENABLE_MOCKS=true (ver playwright.config.ts): o MSW faz o papel do backend.

test('rota protegida sem sessão vai para o login com redirect', async ({ page }) => {
  await page.goto('/registros')

  await expect(page).toHaveURL(/\/login\?redirect=%2Fregistros$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
})

test('cadastrar → logar → ver o layout autenticado → sair', async ({ page }) => {
  const email = `e2e-${Date.now()}@veridt.test`
  const password = 'senha-e2e-123'

  // Cadastro (usuário comum)
  await page.goto('/cadastro')
  await page.getByLabel('Nome completo').fill('Pessoa Teste E2E')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('CPF').pressSequentially('11144477735')
  await expect(page.getByLabel('CPF')).toHaveValue('111.444.777-35')
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)
  await page.getByRole('button', { name: 'Cadastrar' }).click()

  // Login (e-mail já preenchido após o cadastro)
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('E-mail')).toHaveValue(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Layout autenticado
  await expect(page).toHaveURL(/\/registros$/)
  await expect(page.getByRole('heading', { name: 'Registros' })).toBeVisible()
  await expect(page.getByTestId('saldo-creditos')).toHaveText('0 créditos')
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()

  // Nada de sessão no storage
  const storage = await page.evaluate(() => [localStorage.length, sessionStorage.length])
  expect(storage).toEqual([0, 0])

  // Sair
  await page.getByRole('button', { name: 'Menu do usuário' }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // Sem sessão de novo
  await page.goto('/creditos')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcreditos$/)
})
