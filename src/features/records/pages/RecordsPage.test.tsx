import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'
import { saveBlob } from '@/shared/lib/download'
import { renderRoutes } from '@/test/render'
import { loginAsDemo } from '@/test/session'

import { RecordsPage } from './RecordsPage'

vi.mock('@/shared/lib/download', () => ({ saveBlob: vi.fn() }))

const routes = [
  // Como em src/app/routes.tsx: uma rota só, com o id opcional.
  { path: '/registros/:id?', element: <RecordsPage /> },
  { path: '/capturas/nova', element: <p>novo registro</p> },
]

type User = ReturnType<typeof renderRoutes>['user']

const rows = () => screen.getAllByRole('row').slice(1)

async function chooseOption(user: User, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }))
}

describe('RecordsPage', () => {
  beforeEach(async () => {
    await loginAsDemo()
  })

  it('lista os registros mais recentes e pagina', async () => {
    const { user, router } = renderRoutes(routes, '/registros')

    expect(await screen.findByText('Mostrando 1–10 de 25 registros')).toBeInTheDocument()
    expect(rows()).toHaveLength(10)
    expect(within(rows()[0]!).getByText('Processando')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Página 3' }))

    expect(await screen.findByText('Mostrando 21–25 de 25 registros')).toBeInTheDocument()
    expect(rows()).toHaveLength(5)
    expect(router.state.location.search).toBe('?pagina=3')
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  })

  it('filtra por status e guarda o filtro na URL', async () => {
    const { user, router } = renderRoutes(routes, '/registros?pagina=2')
    await screen.findByText('Mostrando 11–20 de 25 registros')

    await chooseOption(user, 'Status', 'Falhou')

    expect(await screen.findByText('Mostrando 1–2 de 2 registros')).toBeInTheDocument()
    expect(rows().every((row) => within(row).queryByText('Falhou'))).toBe(true)
    // Mudar o filtro volta para a primeira página.
    expect(router.state.location.search).toBe('?status=FALHOU')
  })

  it('busca pelo título ou pela URL depois de uma pausa na digitação', async () => {
    const { user, router } = renderRoutes(routes, '/registros')
    await screen.findByText('Mostrando 1–10 de 25 registros')

    await user.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'loja-exemplo')

    await waitFor(() => expect(router.state.location.search).toBe('?q=loja-exemplo'))
    await waitFor(() =>
      expect(rows().every((row) => within(row).queryByText('loja-exemplo.com.br'))).toBe(true),
    )
  })

  it('sem resultado no filtro, oferece limpar os filtros', async () => {
    const { user, router } = renderRoutes(routes, '/registros?q=nada-encontrado')

    expect(
      await screen.findByText('Nenhum registro encontrado com esses filtros'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(await screen.findByText('Mostrando 1–10 de 25 registros')).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('')
  })

  it('conta sem registros vê o convite para o primeiro registro', async () => {
    server.use(
      http.get('*/api/records', () =>
        HttpResponse.json({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
      ),
    )
    const { user } = renderRoutes(routes, '/registros')

    expect(await screen.findByText('Você ainda não fez nenhum registro')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Fazer o primeiro registro' }))
    expect(await screen.findByText('novo registro')).toBeInTheDocument()
  })

  it('mostra o erro e tenta de novo', { timeout: 10_000 }, async () => {
    let fail = true
    server.use(
      http.get('*/api/records', () =>
        fail ? HttpResponse.json({ status: 500 }, { status: 500 }) : undefined,
      ),
    )
    const { user } = renderRoutes(routes, '/registros')

    // A consulta tenta mais duas vezes antes de desistir (1 s + 2 s).
    expect(
      await screen.findByText('Não foi possível carregar os registros', {}, { timeout: 5_000 }),
    ).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Mostrando 1–10 de 25 registros')).toBeInTheDocument()
  })
})

describe('Painel de detalhes do registro', () => {
  beforeEach(async () => {
    await loginAsDemo()
    vi.mocked(saveBlob).mockClear()
  })

  it('abre pela lista com os hashes e fecha voltando para os mesmos filtros', async () => {
    const { user, router } = renderRoutes(routes, '/registros?status=CONCLUIDO')
    await screen.findByText(/de 22 registros/)

    await user.click(within(rows()[0]!).getByRole('link', { name: /Ver detalhes/ }))

    const sheet = await screen.findByRole('dialog', { name: /Registro #/ })
    expect(await within(sheet).findByText('Integridade dos arquivos (SHA-256)')).toBeInTheDocument()
    expect(within(sheet).getAllByRole('button', { name: /Copiar hash de/ })).toHaveLength(3)
    expect(within(sheet).getByText('3 (2 imagens, 1 vídeo)')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/registros')
    expect(router.state.location.search).toBe('?status=CONCLUIDO')
  })

  it('por link direto, fechar leva para a lista', async () => {
    const { user, router } = renderRoutes(routes, '/registros/000127')
    const sheet = await screen.findByRole('dialog', { name: 'Registro #000127' })
    await within(sheet).findByText('Publicação ofensiva em rede social')

    await user.click(within(sheet).getByRole('button', { name: 'Fechar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/registros'))
  })

  it('registro processando: hashes pendentes e ações desativadas', async () => {
    renderRoutes(routes, '/registros/000128')
    const sheet = await screen.findByRole('dialog', { name: 'Registro #000128' })

    expect(await within(sheet).findByText('Registro em processamento')).toBeInTheDocument()
    expect(
      within(sheet).getByText('Os hashes aparecem aqui quando o processamento terminar.'),
    ).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Gerar relatório' })).toBeDisabled()
    expect(within(sheet).getByRole('button', { name: 'Fazer download (.zip)' })).toBeDisabled()
  })

  it('registro que falhou mostra o motivo e o crédito devolvido', async () => {
    renderRoutes(routes, '/registros/000125')
    const sheet = await screen.findByRole('dialog', { name: 'Registro #000125' })

    expect(await within(sheet).findByText('O registro falhou')).toBeInTheDocument()
    expect(within(sheet).getByText(/crédito usado foi devolvido/)).toBeInTheDocument()
  })

  it('registro inexistente', async () => {
    renderRoutes(routes, '/registros/999999')

    expect(await screen.findByText('Registro não encontrado')).toBeInTheDocument()
  })

  it('gera a prévia do relatório, baixa o PDF e o .zip', async () => {
    const { user } = renderRoutes(routes, '/registros/000127')
    const sheet = await screen.findByRole('dialog', { name: 'Registro #000127' })
    await within(sheet).findByText('Integridade dos arquivos (SHA-256)')

    await user.click(within(sheet).getByRole('button', { name: 'Fazer download (.zip)' }))
    await waitFor(() =>
      expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'registro-000127.zip'),
    )

    await user.click(within(sheet).getByRole('button', { name: 'Gerar relatório' }))
    const report = await screen.findByRole('dialog', { name: 'Relatório do registro #000127' })
    expect(within(report).getAllByText(/UTC$/).length).toBeGreaterThan(0)
    await user.click(within(report).getByRole('button', { name: 'Baixar PDF' }))
    await waitFor(() =>
      expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'registro-000127.pdf'),
    )

    // Esc fecha só o relatório; o segundo Esc fecha o painel.
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Relatório/ })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('dialog', { name: 'Registro #000127' })).toBeInTheDocument()
    // O foco volta para o botão que abriu o relatório.
    expect(screen.getByRole('button', { name: 'Gerar relatório' })).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
