import { expect, test } from '@playwright/test'

// Roda com VITE_ENABLE_MOCKS=true: o MSW aprova o Pix sozinho após alguns segundos.
const DEMO = { email: 'demo@veridt.test', password: 'senha-demo-123' }

test('comprar créditos com Pix atualiza o saldo', async ({ page }) => {
  await page.goto('/login?redirect=%2Fcreditos')
  await page.getByLabel('E-mail').fill(DEMO.email)
  await page.getByLabel('Senha', { exact: true }).fill(DEMO.password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Compra de Créditos' })).toBeVisible()
  await expect(page.getByText('Saldo de créditos atual: 10')).toBeVisible()

  await page.getByRole('button', { name: 'Escolher: Pacote Médio' }).click()
  await page.getByLabel('CPF').pressSequentially('52998224725')
  await page.getByLabel('Telefone').pressSequentially('71998765432')
  await page.getByLabel('CEP').pressSequentially('40170115')
  await page.getByLabel('Endereço').fill('Av. Adhemar de Barros')
  await page.getByLabel('Número').fill('500')
  await page.getByLabel('Bairro').fill('Ondina')
  await page.getByLabel('Cidade').fill('Salvador')
  await page.getByRole('combobox', { name: 'Estado' }).click()
  await page.getByRole('option', { name: 'Bahia (BA)' }).click()

  await page.getByRole('button', { name: 'Pagar com PIX' }).click()

  const dialog = page.getByRole('dialog', { name: 'PIX Gerado' })
  await expect(dialog.getByRole('img', { name: /QR Code Pix/ })).toBeVisible()
  await expect(dialog.getByText('Pagamento aprovado')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('saldo-creditos')).toHaveText('Créditos: 40')
})
