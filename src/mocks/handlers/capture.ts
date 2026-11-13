import { delay, http, HttpResponse, ws } from 'msw'

import type {
  Capture,
  CapturePrice,
  CaptureScreenshot,
  CaptureStatus,
  CreateCaptureRequest,
  ServerMessage,
} from '@/features/capture'

import { problem } from '../utils'
import { getSessionUser, spendCredits } from './auth'
import { addMockRecord } from './records'

/**
 * Backend de captura em memória: a sessão abre o "site" depois de
 * {@link MOCK_LOAD_MS}, manda quadros pelo WebSocket e, ao concluir, desconta o
 * crédito e cria um registro em processamento. Um endereço com `nao-abre` simula
 * um site fora do ar (`LOAD_FAILED`).
 */

/** Créditos por registro nos mocks. */
export const MOCK_PRICE: CapturePrice = { creditsPerRecord: 1 }

/** Tempo que o navegador remoto simulado leva para abrir o site. */
export const MOCK_LOAD_MS = 800

/** Abertura automática do site; os testes podem desligá-la e abrir na hora certa. */
let autoLoad = true

/** JPEG 1×1 (cinza) para quando não há `OffscreenCanvas` (testes no jsdom). */
const TINY_JPEG =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='

const FRAME_WIDTH = 1280
const FRAME_HEIGHT = 720

type Client = { send: (data: string) => void; close: () => void }

type StoredCapture = Capture & { ownerId: string; ownerEmail: string; ownerName: string }

const captures = new Map<string, StoredCapture>()
const clients = new Map<string, Set<Client>>()
const timers = new Set<ReturnType<typeof setTimeout>>()
let nextId = 1

export function resetCaptureMock() {
  autoLoad = true
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
  captures.clear()
  clients.clear()
  nextId = 1
}

function later(ms: number, fn: () => void) {
  const timer = setTimeout(() => {
    timers.delete(timer)
    fn()
  }, ms)
  timers.add(timer)
}

function broadcast(id: string, message: ServerMessage) {
  const data = JSON.stringify(message)
  for (const client of clients.get(id) ?? []) client.send(data)
}

function setStatus(capture: StoredCapture, status: CaptureStatus) {
  capture.status = status
  broadcast(capture.id, { type: 'status', status })
}

/** Desenha uma página de exemplo com o título e a URL; JPEG em base64. */
async function renderFrame(capture: StoredCapture): Promise<string> {
  if (typeof OffscreenCanvas === 'undefined') return TINY_JPEG
  const canvas = new OffscreenCanvas(FRAME_WIDTH, FRAME_HEIGHT)
  const ctx = canvas.getContext('2d')
  if (!ctx) return TINY_JPEG
  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT)
  ctx.fillStyle = '#1f2937'
  ctx.font = 'bold 34px sans-serif'
  ctx.fillText(new URL(capture.url).host, 64, 90)
  ctx.fillStyle = '#e5e7eb'
  ctx.fillRect(64, 140, 560, 420)
  ctx.fillStyle = '#4b5563'
  ctx.font = '22px sans-serif'
  ctx.fillText('Página de exemplo (mocks)', 230, 360)
  ctx.fillStyle = '#111827'
  ctx.font = '600 30px sans-serif'
  ctx.fillText(capture.title.slice(0, 40), 680, 180)
  ctx.fillStyle = '#374151'
  ctx.font = '20px monospace'
  ctx.fillText(capture.url.slice(0, 52), 680, 230)
  ctx.font = '18px monospace'
  ctx.fillText(new Date().toISOString().slice(11, 19) + ' UTC', 680, 270)
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function sendFrame(capture: StoredCapture) {
  if (capture.status !== 'READY' && capture.status !== 'RECORDING') return
  const data = await renderFrame(capture)
  broadcast(capture.id, { type: 'frame', data, width: FRAME_WIDTH, height: FRAME_HEIGHT })
}

/** Termina de "abrir" o site: `READY` com um quadro, ou `LOAD_FAILED` (`nao-abre`). */
function finishLoading(capture: StoredCapture) {
  if (capture.status !== 'LOADING') return
  if (capture.url.includes('nao-abre')) {
    setStatus(capture, 'LOAD_FAILED')
    return
  }
  setStatus(capture, 'READY')
  void sendFrame(capture)
}

/**
 * Testes: `false` deixa as sessões novas em `LOADING` até {@link openMockSite},
 * para conferir o estado "abrindo" sem depender do relógio.
 */
export function setMockAutoLoad(value: boolean) {
  autoLoad = value
}

/** Testes: termina de abrir o site de uma sessão na hora. */
export function openMockSite(id: string) {
  const capture = captures.get(id)
  if (capture) finishLoading(capture)
}

/** Simula uma falha depois que o site abriu (ex.: o navegador remoto caiu). */
export function failMockCapture(id: string) {
  const capture = captures.get(id)
  if (capture && (capture.status === 'READY' || capture.status === 'RECORDING')) {
    setStatus(capture, 'FAILED')
  }
}

function toCapture({
  ownerId: _id,
  ownerEmail: _email,
  ownerName: _name,
  ...capture
}: StoredCapture): Capture {
  return capture
}

const unauthenticated = () => problem(401, 'NAO_AUTENTICADO', 'Autenticação necessária.')
const notFound = () => problem(404, 'CAPTURA_NAO_ENCONTRADA', 'Sessão de captura não encontrada.')
const unavailable = (message: string) => problem(409, 'CAPTURA_INDISPONIVEL', message)

/** A captura do usuário da sessão, ou a resposta de erro adequada. */
function ownCapture(id: unknown): StoredCapture | Response {
  const user = getSessionUser()
  if (!user) return unauthenticated()
  const capture = captures.get(String(id))
  return capture && capture.ownerId === user.id ? capture : notFound()
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const socket = ws.link('*/ws/capture/:id')

export const captureHandlers = [
  http.get('*/api/captures/price', async () => {
    await delay(100)
    if (!getSessionUser()) return unauthenticated()
    return HttpResponse.json(MOCK_PRICE)
  }),

  http.post('*/api/captures', async ({ request }) => {
    await delay()
    const user = getSessionUser()
    if (!user) return unauthenticated()
    const body = (await request.json()) as CreateCaptureRequest
    const title = body.title?.trim() ?? ''
    const url = body.url?.trim() ?? ''

    const errors = []
    if (!title) errors.push({ field: 'title', message: 'Informe o título do registro.' })
    if (!isValidUrl(url)) {
      errors.push({ field: 'url', message: 'Informe um endereço válido, com http:// ou https://.' })
    }
    if (errors.length) return problem(400, 'DADOS_INVALIDOS', 'Dados inválidos.', errors)

    if ((user.creditBalance ?? 0) < MOCK_PRICE.creditsPerRecord) {
      return problem(402, 'SALDO_INSUFICIENTE', 'Seu saldo de créditos não cobre este registro.')
    }

    const capture: StoredCapture = {
      id: `cap-${nextId++}`,
      title,
      url,
      status: 'LOADING',
      cost: MOCK_PRICE.creditsPerRecord,
      startedAt: new Date().toISOString(),
      screenshots: [],
      recordingStartedAt: null,
      recordings: 0,
      recordId: null,
      ownerId: user.id,
      ownerEmail: user.email,
      ownerName: user.fullName,
    }
    captures.set(capture.id, capture)

    if (autoLoad) later(MOCK_LOAD_MS, () => finishLoading(capture))

    return HttpResponse.json(toCapture(capture), { status: 201 })
  }),

  http.get('*/api/captures/:id', async ({ params }) => {
    await delay(100)
    const capture = ownCapture(params.id)
    return capture instanceof Response ? capture : HttpResponse.json(toCapture(capture))
  }),

  http.post('*/api/captures/:id/screenshots', async ({ params }) => {
    await delay(200)
    const capture = ownCapture(params.id)
    if (capture instanceof Response) return capture
    if (capture.status !== 'READY' && capture.status !== 'RECORDING') {
      return unavailable('Só é possível capturar a tela com o site aberto.')
    }
    const screenshot: CaptureScreenshot = {
      name: `captura-${String(capture.screenshots.length + 1).padStart(2, '0')}.png`,
      capturedAt: new Date().toISOString(),
    }
    capture.screenshots.push(screenshot)
    return HttpResponse.json(screenshot, { status: 201 })
  }),

  http.post('*/api/captures/:id/recording/start', async ({ params }) => {
    await delay(150)
    const capture = ownCapture(params.id)
    if (capture instanceof Response) return capture
    if (capture.status !== 'READY') return unavailable('A gravação só começa com o site aberto.')
    capture.recordingStartedAt = new Date().toISOString()
    setStatus(capture, 'RECORDING')
    return HttpResponse.json(toCapture(capture))
  }),

  http.post('*/api/captures/:id/recording/stop', async ({ params }) => {
    await delay(150)
    const capture = ownCapture(params.id)
    if (capture instanceof Response) return capture
    if (capture.status !== 'RECORDING') return unavailable('Não há gravação em andamento.')
    capture.recordingStartedAt = null
    capture.recordings++
    setStatus(capture, 'READY')
    return HttpResponse.json(toCapture(capture))
  }),

  http.post('*/api/captures/:id/finish', async ({ params }) => {
    await delay()
    const capture = ownCapture(params.id)
    if (capture instanceof Response) return capture
    if (capture.status !== 'READY' && capture.status !== 'RECORDING') {
      return unavailable('Esta sessão de captura já terminou.')
    }
    if (capture.status === 'RECORDING') {
      capture.recordingStartedAt = null
      capture.recordings++
    }
    if (capture.screenshots.length === 0 && capture.recordings === 0) {
      return unavailable('Capture ao menos uma tela ou grave um vídeo antes de concluir.')
    }
    if (!spendCredits(capture.ownerId, capture.cost)) {
      return problem(402, 'SALDO_INSUFICIENTE', 'Seu saldo de créditos não cobre este registro.')
    }

    const files = [
      ...capture.screenshots.map((s) => ({
        name: s.name,
        kind: 'IMAGEM' as const,
        sizeBytes: 1_200_000,
        capturedAt: s.capturedAt,
      })),
      ...Array.from({ length: capture.recordings }, (_, index) => ({
        name: `video-navegacao-${index + 1}.mp4`,
        kind: 'VIDEO' as const,
        sizeBytes: 38_000_000,
        capturedAt: new Date().toISOString(),
      })),
    ]
    capture.recordId = addMockRecord({
      ownerEmail: capture.ownerEmail,
      title: capture.title,
      url: capture.url,
      startedAt: capture.startedAt,
      responsible: capture.ownerName,
      files,
    })
    setStatus(capture, 'FINISHED')
    return HttpResponse.json({ recordId: capture.recordId })
  }),

  http.post('*/api/captures/:id/cancel', async ({ params }) => {
    await delay(150)
    const capture = ownCapture(params.id)
    if (capture instanceof Response) return capture
    if (capture.status === 'FINISHED') return unavailable('Esta sessão já virou um registro.')
    if (capture.status !== 'CANCELED') setStatus(capture, 'CANCELED')
    return new HttpResponse(null, { status: 204 })
  }),

  socket.addEventListener('connection', ({ client, params }) => {
    const capture = captures.get(String(params.id))
    if (!capture) {
      client.close(4404, 'Sessão de captura não encontrada.')
      return
    }
    const set = clients.get(capture.id) ?? new Set<Client>()
    set.add(client)
    clients.set(capture.id, set)

    client.send(JSON.stringify({ type: 'status', status: capture.status }))
    void sendFrame(capture)

    // Mouse, rolagem e teclado: o "site" responde com um quadro novo.
    client.addEventListener('message', () => void sendFrame(capture))
    client.addEventListener('close', () => set.delete(client))
  }),
]
