import { expect, test } from '@playwright/test'

// Smoke do ambiente: a SPA sobe em pt-BR com os mocks ligados.
// O fluxo cadastro → login → layout → logout entra quando as rotas forem criadas.
test('a aplicação carrega', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Veridt')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.getByRole('heading', { name: 'Veridt' })).toBeVisible()
})
