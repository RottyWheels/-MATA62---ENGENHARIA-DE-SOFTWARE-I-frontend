import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { openMockSite, setMockAutoLoad } from '@/mocks/handlers/capture'
import { http } from '@/shared/api/http'
import { renderRoutes } from '@/test/render'
import { loginAsDemo } from '@/test/session'

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
