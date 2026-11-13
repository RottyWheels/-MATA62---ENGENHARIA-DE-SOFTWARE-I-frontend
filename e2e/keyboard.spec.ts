import { expect, test, type Page } from '@playwright/test'

// Teclado: as telas novas funcionam sem mouse, e o foco não se perde ao abrir e fechar painéis.
const DEMO = { email: 'demo@veridt.test', password: 'senha-demo-123' }

/** Descrição curta do elemento com foco, para comparar nos testes. */
const focused = (page: Page) =>
  page.evaluate<string>(
    "(() => { const el = document.activeElement; return el ? (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 60) : '' })()",
  )

test('painel de detalhes pelo teclado: abre com Enter e devolve o foco ao fechar', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(DEMO.email)
  await page.getByLabel('Senha', { exact: true }).fill(DEMO.password)
  await page.getByLabel('Senha', { exact: true }).press('Enter')
  await expect(page.getByText(/Mostrando 1–10 de 25/)).toBeVisible()

  const link = page.getByRole('link', { name: /Ver detalhes/ }).nth(1)
  await link.focus()
  const linkText = await focused(page)
  await page.keyboard.press('Enter')

  const sheet = page.getByRole('dialog', { name: /Registro #/ })
  await expect(sheet).toBeVisible()
  // O foco entra no painel.
  expect(await sheet.evaluate((el) => el.contains(el.ownerDocument.activeElement))).toBe(true)

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  // E volta para o link que abriu o painel.
  await expect.poll(() => focused(page)).toBe(linkText)
})
