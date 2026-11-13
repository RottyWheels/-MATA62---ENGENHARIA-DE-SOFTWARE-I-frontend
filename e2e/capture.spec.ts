import { expect, test } from '@playwright/test'

// Roda com VITE_ENABLE_MOCKS=true: o MSW simula a API e o WebSocket do navegador remoto.
const DEMO = { email: 'demo@veridt.test', password: 'senha-demo-123' }

test('registrar um site: capturar, gravar, concluir e ver o registro na lista', async ({
  page,
}) => {
  await page.goto('/login?redirect=%2Fcapturas%2Fnova')
  await page.getByLabel('E-mail').fill(DEMO.email)
  await page.getByLabel('Senha', { exact: true }).fill(DEMO.password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Novo Registro: custo e saldo antes de começar.
  await expect(page.getByRole('heading', { name: 'Iniciar Registro de Conteúdo' })).toBeVisible()
  await expect(page.getByText('Este registro consome 1 crédito')).toBeVisible()
  await expect(page.getByTestId('saldo-creditos')).toHaveText('Créditos: 10')

  await page.getByLabel('Título do Registro').fill('Anúncio do imóvel da Rua das Flores')
  await page.getByLabel('URL do site').fill('https://imobiliaria-exemplo.com.br/anuncio/4821')
  await page.getByRole('button', { name: 'Iniciar Registro' }).click()

  // Sessão: o site abre no navegador remoto.
  await expect(page).toHaveURL(/\/capturas\/cap-1\/sessao$/)
  const screenshotButton = page.getByRole('button', { name: 'Capturar Tela' })
  await expect(screenshotButton).toBeEnabled()

  await screenshotButton.click()
  await expect(page.getByRole('region', { name: 'Capturas desta sessão (1)' })).toBeVisible()

  await page.getByRole('button', { name: 'Iniciar Gravação' }).click()
  await expect(page.getByText('Gravando', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Concluir gravação' }).click()
  await expect(page.getByRole('button', { name: 'Iniciar Gravação' })).toBeVisible()

  await page.getByRole('button', { name: 'Concluir registro' }).click()

  // Conclusão: o registro vai para processamento e o crédito é descontado.
  const dialog = page.getByRole('dialog', { name: 'Registro enviado para processamento' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('1 imagem e 1 vídeo')).toBeVisible()
  await expect(dialog.getByText('#000129')).toBeVisible()
  await expect(page.getByTestId('saldo-creditos')).toHaveText('Créditos: 9')

  await dialog.getByRole('link', { name: 'Ver registro' }).click()

  // Detalhes: o painel abre sobre a lista, com o registro em processamento.
  await expect(page).toHaveURL(/\/registros\/000129$/)
  const sheet = page.getByRole('dialog', { name: 'Registro #000129' })
  await expect(sheet.getByText('Registro em processamento')).toBeVisible()
  await expect(sheet.getByText('2 (1 imagem, 1 vídeo)')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/registros$/)
  const firstRow = page.getByRole('row').nth(1)
  await expect(firstRow).toContainText('Anúncio do imóvel da Rua das Flores')
  await expect(firstRow).toContainText('Processando')
})

test('site fora do ar não cobra nada e volta ao formulário preenchido', async ({ page }) => {
  await page.goto('/login?redirect=%2Fcapturas%2Fnova')
  await page.getByLabel('E-mail').fill(DEMO.email)
  await page.getByLabel('Senha', { exact: true }).fill(DEMO.password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await page.getByLabel('Título do Registro').fill('Loja fora do ar')
  await page.getByLabel('URL do site').fill('https://nao-abre.exemplo.com.br/produto')
  // Enviar com Enter, como no teclado.
  await page.getByLabel('URL do site').press('Enter')

  await expect(page.getByText('Não foi possível abrir o site', { exact: true })).toBeVisible()
  await expect(page.getByText(/Nenhum crédito foi consumido/)).toBeVisible()

  await page.getByRole('button', { name: 'Alterar endereço' }).click()
  await expect(page).toHaveURL(/\/capturas\/nova$/)
  await expect(page.getByLabel('URL do site')).toHaveValue(
    'https://nao-abre.exemplo.com.br/produto',
  )
  await expect(page.getByTestId('saldo-creditos')).toHaveText('Créditos: 10')
})
