import { expect, test, type Page } from '@playwright/test'

// Celular (375 px): nenhuma tela pode rolar para o lado. A navegação é por cliques,
// porque recarregar a página apaga a sessão dos mocks.
test.use({ viewport: { width: 375, height: 812 } })

const DEMO = { email: 'demo@veridt.test', password: 'senha-demo-123' }

async function expectNoHorizontalScroll(page: Page, screen: string) {
  // Expressão em texto: a pasta e2e é compilada sem os tipos do navegador (DOM).
  const widths = await page.evaluate<{ page: number; viewport: number }>(
    '({ page: document.documentElement.scrollWidth, viewport: window.innerWidth })',
  )
  expect(widths.page, `rolagem lateral em ${screen}`).toBeLessThanOrEqual(widths.viewport)
}

test('as telas cabem em 375 px', async ({ page }) => {
  await page.goto('/login')
  await expectNoHorizontalScroll(page, 'login')
  await page.getByLabel('E-mail').fill(DEMO.email)
  await page.getByLabel('Senha', { exact: true }).fill(DEMO.password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Lista: a tabela rola dentro da própria caixa, não a página.
  await expect(page.getByRole('heading', { name: 'Listagem dos Registros' })).toBeVisible()
  await expect(page.getByText(/Mostrando 1–10 de 25/)).toBeVisible()
  await expectNoHorizontalScroll(page, 'lista dos registros')

  await page
    .getByRole('link', { name: /Ver detalhes/ })
    .nth(1)
    .click()
  await expect(page.getByRole('dialog', { name: /Registro #/ })).toBeVisible()
  await expectNoHorizontalScroll(page, 'detalhes do registro')
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Novo Registro' }).click()
  await expect(page.getByText('Este registro consome 1 crédito')).toBeVisible()
  await expectNoHorizontalScroll(page, 'novo registro')

  await page.getByLabel('Título do Registro').fill('Anúncio do imóvel')
  await page.getByLabel('URL do site').fill('https://imobiliaria-exemplo.com.br/anuncio/4821')
  await page.getByRole('button', { name: 'Iniciar Registro' }).click()
  await expect(page.getByRole('button', { name: 'Capturar Tela' })).toBeEnabled()
  await page.getByRole('button', { name: 'Capturar Tela' }).click()
  await expect(page.getByRole('region', { name: 'Capturas desta sessão (1)' })).toBeVisible()
  await expectNoHorizontalScroll(page, 'sessão de captura')

  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('link', { name: 'Comprar Créditos' }).click()
  await expect(page.getByRole('heading', { name: 'Compra de Créditos' })).toBeVisible()
  await expectNoHorizontalScroll(page, 'compra de créditos')
})
