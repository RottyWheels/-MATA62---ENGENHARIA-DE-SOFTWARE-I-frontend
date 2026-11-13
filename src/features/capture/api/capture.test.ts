import { renderHook, waitFor } from '@testing-library/react'
import { isAxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import type { Page, RecordSummary } from '@/features/records'
import { MOCK_LOAD_MS } from '@/mocks/handlers/capture'
import { http } from '@/shared/api/http'
import { loginAsDemo, loginAsNewUser, sessionBalance } from '@/test/session'

import { useCaptureSocket } from '../hooks/useCaptureSocket'
import {
  getCapture,
  getCapturePrice,
  postCancel,
  postCapture,
  postFinish,
  postRecordingStart,
  postRecordingStop,
  postScreenshot,
} from './capture'

const SITE = { title: 'Anúncio do imóvel', url: 'https://imobiliaria-exemplo.com.br/anuncio/4821' }

/** Status e código do erro da API, para comparar com `toMatchObject`. */
async function failure(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    if (isAxiosError(error)) return { status: error.response?.status, ...error.response?.data }
    throw error
  }
  throw new Error('a requisição deveria ter falhado')
}

async function openSite(input = SITE) {
  const capture = await postCapture(input)
  await waitFor(async () => expect((await getCapture(capture.id)).status).not.toBe('LOADING'), {
    timeout: MOCK_LOAD_MS * 4,
  })
  return getCapture(capture.id)
}

describe('API de captura (mocks)', () => {
  it('informa o preço e cria a sessão abrindo o site', async () => {
    await loginAsDemo()
    expect(await getCapturePrice()).toEqual({ creditsPerRecord: 1 })

    const created = await postCapture(SITE)
    expect(created).toMatchObject({ status: 'LOADING', cost: 1, screenshots: [], recordId: null })

    expect(await openSite()).toMatchObject({ status: 'READY' })
  })

  it('valida o título e a URL', async () => {
    await loginAsDemo()

    expect(await failure(postCapture({ title: ' ', url: 'imobiliaria.com.br' }))).toMatchObject({
      status: 400,
      code: 'DADOS_INVALIDOS',
      errors: [{ field: 'title' }, { field: 'url' }],
    })
  })

  it('recusa com 402 quando o saldo não cobre o registro', async () => {
    await loginAsNewUser('sem-saldo@veridt.test')

    expect(await failure(postCapture(SITE))).toMatchObject({
      status: 402,
      code: 'SALDO_INSUFICIENTE',
    })
  })

  it('site fora do ar termina em LOAD_FAILED', async () => {
    await loginAsDemo()

    const capture = await openSite({ title: 'Teste', url: 'https://nao-abre.exemplo.com' })

    expect(capture.status).toBe('LOAD_FAILED')
    expect(await failure(postScreenshot(capture.id))).toMatchObject({ status: 409 })
  })

  it('captura, grava e conclui: desconta 1 crédito e cria o registro', async () => {
    await loginAsDemo()
    const before = (await sessionBalance()) ?? 0
    const capture = await openSite()

    expect(await postScreenshot(capture.id)).toMatchObject({ name: 'captura-01.png' })
    expect(await postRecordingStart(capture.id)).toMatchObject({ status: 'RECORDING' })
    expect(await postRecordingStop(capture.id)).toMatchObject({ status: 'READY', recordings: 1 })

    const { recordId } = await postFinish(capture.id)

    expect((await getCapture(capture.id)).status).toBe('FINISHED')
    expect(await sessionBalance()).toBe(before - 1)
    const { data: records } = await http.get<Page<RecordSummary>>('/records', {
      params: { size: 1 },
    })
    const [latest] = records.content
    expect(latest).toMatchObject({ id: recordId, title: SITE.title, status: 'PROCESSANDO' })
  })

  it('não conclui sem nenhuma captura nem gravação', async () => {
    await loginAsDemo()
    const capture = await openSite()

    expect(await failure(postFinish(capture.id))).toMatchObject({
      status: 409,
      message: 'Capture ao menos uma tela ou grave um vídeo antes de concluir.',
    })
  })

  it('cancelar encerra a sessão sem gastar crédito', async () => {
    await loginAsDemo()
    const before = await sessionBalance()
    const capture = await openSite()
    await postScreenshot(capture.id)

    await postCancel(capture.id)

    expect((await getCapture(capture.id)).status).toBe('CANCELED')
    expect(await failure(postFinish(capture.id))).toMatchObject({ status: 409 })
    expect(await sessionBalance()).toBe(before)
  })
})

describe('useCaptureSocket com o WebSocket simulado', () => {
  it('recebe o status e os quadros, e para de reconectar ao concluir', async () => {
    await loginAsDemo()
    const capture = await postCapture(SITE)

    const { result } = renderHook(() => useCaptureSocket(capture.id))

    await waitFor(() => expect(result.current.status).toBe('open'))
    await waitFor(() => expect(result.current.captureStatus).toBe('READY'), {
      timeout: MOCK_LOAD_MS * 4,
    })
    await waitFor(() => expect(result.current.lastFrame).not.toBeNull())
    expect(result.current.lastFrame).toMatchObject({ type: 'frame', width: 1280, height: 720 })

    await postScreenshot(capture.id)
    await postFinish(capture.id)

    await waitFor(() => expect(result.current.captureStatus).toBe('FINISHED'))
  })
})
