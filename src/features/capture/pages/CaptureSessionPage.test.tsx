import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { failMockCapture, openMockSite, setMockAutoLoad } from '@/mocks/handlers/capture'
import { http } from '@/shared/api/http'
import { renderRoutes } from '@/test/render'
import { loginAsDemo, sessionBalance } from '@/test/session'

import { CaptureSessionPage } from './CaptureSessionPage'
import { NewCapturePage } from './NewCapturePage'

const routes = [
  { path: '/capturas/nova', element: <NewCapturePage /> },
  { path: '/capturas/:id/sessao', element: <CaptureSessionPage /> },
]

async function startCapture(url = 'https://imobiliaria-exemplo.com.br/anuncio/4821') {
  await loginAsDemo()
  const { data } = await http.post<{ id: string }>('/captures', { title: 'Anúncio do imóvel', url })
  return data.id
}

const announcement = () => screen.getByRole('status').textContent

describe('CaptureSessionPage', () => {
  it('mostra o site abrindo e depois o navegador pronto, com os campos bloqueados', async () => {
    // O site só "abre" quando o teste mandar: o estado "abrindo" não depende do relógio.
    setMockAutoLoad(false)
    const id = await startCapture()
    renderRoutes(routes, `/capturas/${id}/sessao`)

    expect(await screen.findByText('Abrindo o site no navegador seguro…')).toBeInTheDocument()
    expect(
      screen.getByText('Os botões ficam disponíveis assim que o site abrir.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Título do Registro')).toHaveValue('Anúncio do imóvel')
    expect(screen.getByLabelText('Título do Registro')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('URL do site')).toHaveValue(
      'https://imobiliaria-exemplo.com.br/anuncio/4821',
    )

    openMockSite(id)

    await waitFor(() =>
      expect(announcement()).toBe(
        'O site abriu. Você já pode capturar a tela ou iniciar a gravação.',
      ),
    )
    await waitFor(() =>
      expect(screen.queryByText('Abrindo o site no navegador seguro…')).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText(/Navegador remoto/)).toHaveAttribute('tabindex', '0')
    // Com o site aberto não há cobertura nenhuma por cima do quadro, nem vazia.
    expect(document.querySelector('[data-slot="browser-overlay"]')).toBeNull()
  })

  it('site fora do ar: avisa que nada foi cobrado e volta ao formulário preenchido', async () => {
    const id = await startCapture('https://nao-abre.exemplo.com.br/produto')
    const { user, router } = renderRoutes(routes, `/capturas/${id}/sessao`)

    expect(await screen.findByText('Não foi possível abrir o site')).toBeInTheDocument()
    expect(screen.getByText(/Nenhum crédito foi consumido/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Navegador remoto/)).toHaveAttribute('tabindex', '-1')

    await user.click(screen.getByRole('button', { name: 'Alterar endereço' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/capturas/nova'))
    expect(await screen.findByLabelText('Título do Registro')).toHaveValue('Anúncio do imóvel')
    expect(screen.getByLabelText('URL do site')).toHaveValue(
      'https://nao-abre.exemplo.com.br/produto',
    )
  })

  it('"Tentar novamente" abre uma sessão nova no lugar da que falhou', async () => {
    const id = await startCapture('https://nao-abre.exemplo.com.br/produto')
    const { user, router } = renderRoutes(routes, `/capturas/${id}/sessao`)

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/capturas/cap-2/sessao'))
    // Substitui no histórico: voltar não leva para a sessão que falhou.
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('sessão encerrada mostra o estado final', async () => {
    const id = await startCapture()
    await http.post(`/captures/${id}/cancel`)
    renderRoutes(routes, `/capturas/${id}/sessao`)

    await waitFor(() => expect(announcement()).toBe('Registro cancelado.'))
    expect(screen.getByRole('link', { name: 'Ver a lista dos registros' })).toBeInTheDocument()
  })

  it('sessão inexistente', async () => {
    await loginAsDemo()
    renderRoutes(routes, '/capturas/cap-99/sessao')

    expect(await screen.findByText('Sessão de captura não encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Novo Registro' })).toHaveAttribute(
      'href',
      '/capturas/nova',
    )
  })
})

describe('CaptureSessionPage: gravação e capturas de tela', () => {
  const READY = 'O site abriu. Você já pode capturar a tela ou iniciar a gravação.'

  async function openSession() {
    const id = await startCapture()
    const rendered = renderRoutes(routes, `/capturas/${id}/sessao`)
    await waitFor(() => expect(announcement()).toBe(READY))
    return { id, ...rendered }
  }

  it('"Concluir registro" pede ao menos uma captura ou gravação', async () => {
    await openSession()

    expect(screen.getByRole('button', { name: 'Concluir registro' })).toBeDisabled()
    expect(
      screen.getByText('Capture ao menos uma tela ou grave um vídeo para concluir o registro.'),
    ).toBeInTheDocument()
  })

  it('captura a tela, grava, para a gravação e conclui', async () => {
    const { user } = await openSession()
    const before = await sessionBalance()

    await user.click(screen.getByRole('button', { name: 'Capturar Tela' }))
    const strip = await screen.findByRole('region', { name: 'Capturas desta sessão (1)' })
    expect(within(strip).getByText('captura-01.png')).toBeInTheDocument()
    expect(
      within(strip).getByRole('img', { name: 'Miniatura de captura-01.png' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Concluir registro' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Iniciar Gravação' }))
    await waitFor(() => expect(announcement()).toBe('Gravando a navegação.'))
    expect(screen.getByText('Gravando')).toBeInTheDocument()
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument()
    // Dá para capturar a tela durante a gravação.
    await user.click(screen.getByRole('button', { name: 'Capturar Tela' }))
    expect(
      await screen.findByRole('region', { name: 'Capturas desta sessão (2)' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Concluir gravação' }))
    await waitFor(() => expect(announcement()).toBe(READY))
    expect(screen.queryByText('Gravando')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Concluir registro' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Registro enviado para processamento',
    })
    expect(within(dialog).getByText('2 imagens e 1 vídeo')).toBeInTheDocument()
    // O saldo é atualizado logo depois de concluir (a consulta `['me']` é refeita).
    expect(await within(dialog).findByText(`1 (saldo: ${(before ?? 0) - 1})`)).toBeInTheDocument()
    expect(await sessionBalance()).toBe((before ?? 0) - 1)
    const { data } = await http.get<{ content: Array<{ title: string; status: string }> }>(
      '/records',
      { params: { size: 1 } },
    )
    const [record] = data.content as Array<{ id: string; title: string; status: string }>
    expect(record).toMatchObject({ title: 'Anúncio do imóvel', status: 'PROCESSANDO' })
    expect(within(dialog).getByText(`#${record!.id}`)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Ver registro' })).toHaveAttribute(
      'href',
      `/registros/${record!.id}`,
    )
    expect(within(dialog).getByRole('link', { name: 'Novo registro' })).toHaveAttribute(
      'href',
      '/capturas/nova',
    )
  })

  it('falha durante a sessão: avisa que nada foi cobrado e tenta de novo', async () => {
    const { id, user, router } = await openSession()
    const before = await sessionBalance()
    await user.click(screen.getByRole('button', { name: 'Iniciar Gravação' }))
    await waitFor(() => expect(announcement()).toBe('Gravando a navegação.'))

    failMockCapture(id)

    const dialog = await screen.findByRole('alertdialog', { name: 'A captura falhou' })
    expect(within(dialog).getByText('Nenhum crédito foi cobrado.')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Voltar para a lista' })).toHaveAttribute(
      'href',
      '/registros',
    )
    expect(await sessionBalance()).toBe(before)

    await user.click(within(dialog).getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/capturas/cap-2/sessao'))
    expect(router.state.historyAction).toBe('REPLACE')
    // A sessão nova começa do zero: nada herdado da que falhou.
    await waitFor(() => expect(announcement()).toBe(READY))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar Gravação' })).toBeEnabled()
  })

  it('fechar o diálogo deixa o aviso por cima do navegador', async () => {
    const { id, user } = await openSession()
    failMockCapture(id)
    await screen.findByRole('alertdialog', { name: 'A captura falhou' })

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Ver a lista dos registros' })).toBeInTheDocument()
  })

  it('cancelar pede confirmação e não cobra nada', async () => {
    const { user, router } = await openSession()
    const before = await sessionBalance()
    await user.click(screen.getByRole('button', { name: 'Capturar Tela' }))
    await screen.findByRole('region', { name: 'Capturas desta sessão (1)' })

    await user.click(screen.getByRole('button', { name: 'Cancelar registro' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancelar este registro?' })
    expect(within(dialog).getByText(/Nenhum crédito será cobrado/)).toBeInTheDocument()

    // Desistir mantém a sessão como estava.
    await user.click(within(dialog).getByRole('button', { name: 'Continuar registrando' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(announcement()).toBe(READY)

    await user.click(screen.getByRole('button', { name: 'Cancelar registro' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Cancelar registro',
      }),
    )

    // Cancelado: volta ao formulário, no lugar da sessão (o voltar não reabre a sessão).
    await waitFor(() => expect(router.state.location.pathname).toBe('/capturas/nova'))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(await sessionBalance()).toBe(before)
  })
})
