import { delay, http, HttpResponse } from 'msw'

import type {
  Page,
  RecordDetails,
  RecordFile,
  RecordStatus,
  RecordSummary,
} from '@/features/records'

import { problem } from '../utils'
import { DEMO_USER, getSessionUser } from './auth'

/**
 * Backend de registros em memória. Só o usuário de demonstração tem registros
 * de exemplo; contas novas começam sem nenhum (estado vazio da lista).
 */

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Quanto tempo um registro "processando" dos mocks leva para concluir. */
export const MOCK_PROCESSING_MS = 20_000

/** `ownerEmail`: só o dono vê o registro. */
type StoredRecord = RecordDetails & { ownerEmail: string; readyAt?: number }

const SAMPLES: Array<[string, string]> = [
  ['Anúncio do imóvel da Rua das Flores', 'https://imobiliaria-exemplo.com.br/anuncio/4821'],
  ['Publicação ofensiva em rede social', 'https://rede-exemplo.com/post/88213'],
  ['Termos de uso da loja virtual', 'https://loja-exemplo.com.br/termos'],
  ['Avaliação negativa do restaurante', 'https://avaliacoes-exemplo.com/r/552'],
  ['Página de preços do concorrente', 'https://concorrente-exemplo.com/precos'],
  ['Comentário em notícia', 'https://jornal-exemplo.com.br/noticia/301'],
  ['Perfil falso usando a marca', 'https://rede-exemplo.com/marca.oficial'],
  ['Contrato publicado no site', 'https://empresa-exemplo.com.br/contrato'],
]

let records: StoredRecord[] = []

/** SHA-256 de mentira, mas estável: 64 dígitos hexadecimais derivados do texto. */
function fakeSha256(text: string) {
  let hash = 0x811c9dc5
  let out = ''
  for (let round = 0; out.length < 64; round++) {
    for (const char of `${text}#${round}`) {
      hash ^= char.charCodeAt(0)
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    out += hash.toString(16).padStart(8, '0')
  }
  return out.slice(0, 64)
}

function filesFor(id: string, start: number, withHash: boolean): RecordFile[] {
  const file = (name: string, kind: RecordFile['kind'], sizeBytes: number, offset: number) => ({
    name,
    kind,
    sizeBytes,
    sha256: withHash ? fakeSha256(`${id}/${name}`) : null,
    capturedAt: new Date(start + offset).toISOString(),
  })
  return [
    file('captura-01.png', 'IMAGEM', 1_250_000, 27_000),
    file('captura-02.png', 'IMAGEM', 1_120_000, 196_000),
    file('video-navegacao.mp4', 'VIDEO', 40_300_000, 217_000),
  ]
}

function seed() {
  const now = Date.now()
  records = Array.from({ length: 25 }, (_, index) => {
    const id = String(127 - index + 1).padStart(6, '0')
    const [title, url] = SAMPLES[index % SAMPLES.length] ?? SAMPLES[0]!
    const start = now - index * 1.3 * DAY - 2 * HOUR
    const finished = new Date(start + 217_000).toISOString()
    const status: RecordStatus =
      index === 0 ? 'PROCESSANDO' : index === 3 || index === 14 ? 'FALHOU' : 'CONCLUIDO'
    const base = {
      id,
      title:
        index < SAMPLES.length ? title : `${title} (${Math.floor(index / SAMPLES.length) + 1})`,
      url,
      status,
      startedAt: new Date(start).toISOString(),
      finishedAt: finished,
      responsible: 'Usuária Demo',
      ownerEmail: DEMO_USER.email,
    }
    if (status === 'FALHOU') {
      return {
        ...base,
        files: [],
        failureReason: 'O navegador seguro perdeu a conexão com o site antes da conclusão.',
        creditRefunded: true,
      }
    }
    if (status === 'PROCESSANDO') {
      return { ...base, files: filesFor(id, start, false), readyAt: now + MOCK_PROCESSING_MS }
    }
    return { ...base, files: filesFor(id, start, true) }
  })
}
seed()

export function resetRecordsMock() {
  seed()
}

/** Conclui na hora um registro que está processando (útil em testes). */
export function completeMockRecord(id: string) {
  const record = records.find((r) => r.id === id)
  if (!record || record.status !== 'PROCESSANDO') return
  record.status = 'CONCLUIDO'
  record.files = record.files.map((f) => ({ ...f, sha256: fakeSha256(`${id}/${f.name}`) }))
  delete record.readyAt
}

/** Cria um registro em processamento a partir de uma sessão de captura concluída. */
export function addMockRecord(input: {
  ownerEmail: string
  title: string
  url: string
  startedAt: string
  responsible: string
  files: Array<Pick<RecordFile, 'name' | 'kind' | 'sizeBytes' | 'capturedAt'>>
}) {
  const next = Math.max(0, ...records.map((r) => Number(r.id))) + 1
  const id = String(next).padStart(6, '0')
  records.unshift({
    id,
    title: input.title,
    url: input.url,
    status: 'PROCESSANDO',
    startedAt: input.startedAt,
    finishedAt: new Date().toISOString(),
    responsible: input.responsible,
    ownerEmail: input.ownerEmail,
    files: input.files.map((f) => ({ ...f, sha256: null })),
    readyAt: Date.now() + MOCK_PROCESSING_MS,
  })
  return id
}

/** Registros do usuário da sessão; `undefined` sem sessão. */
function recordsForSession() {
  const user = getSessionUser()
  if (!user) return undefined
  const now = Date.now()
  for (const record of records) {
    if (record.readyAt !== undefined && record.readyAt <= now) completeMockRecord(record.id)
  }
  return records.filter((r) => r.ownerEmail === user.email)
}

function toSummary({ id, title, url, status, startedAt, finishedAt }: StoredRecord): RecordSummary {
  return { id, title, url, status, startedAt, finishedAt }
}

function toDetails({
  readyAt: _readyAt,
  ownerEmail: _owner,
  ...record
}: StoredRecord): RecordDetails {
  return record
}

const STATUSES: RecordStatus[] = ['EM_ANDAMENTO', 'PROCESSANDO', 'CONCLUIDO', 'FALHOU']

const unauthenticated = () => problem(401, 'NAO_AUTENTICADO', 'Autenticação necessária.')
const notFound = () => problem(404, 'REGISTRO_NAO_ENCONTRADO', 'Registro não encontrado.')

/** PDF mínimo de uma página, suficiente para o navegador abrir. */
function samplePdf(id: string) {
  const text = `Relatorio do registro #${id} (exemplo dos mocks)`
  const stream = `BT /F1 14 Tf 60 760 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  body += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return body
}

/** ZIP vazio válido (só o registro de fim do diretório central). */
const EMPTY_ZIP = new Uint8Array([
  0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
])

export const recordsHandlers = [
  http.get('*/api/records', async ({ request }) => {
    await delay(200)
    const own = recordsForSession()
    if (!own) return unauthenticated()

    const params = new URL(request.url).searchParams
    const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
    const size = Math.min(100, Math.max(1, Number(params.get('size') ?? 10) || 10))
    const status = params.get('status')
    const q = params.get('q')?.trim().toLowerCase()
    const from = params.get('from')

    if (status && !STATUSES.includes(status as RecordStatus)) {
      return problem(400, 'DADOS_INVALIDOS', 'Dados inválidos.', [
        { field: 'status', message: 'Status desconhecido.' },
      ])
    }

    const filtered = own
      .filter((r) => !status || r.status === status)
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.url.toLowerCase().includes(q))
      .filter((r) => !from || r.startedAt >= from)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

    const body: Page<RecordSummary> = {
      content: filtered.slice(page * size, page * size + size).map(toSummary),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    }
    return HttpResponse.json(body)
  }),

  http.get('*/api/records/:id', async ({ params }) => {
    await delay(150)
    const own = recordsForSession()
    if (!own) return unauthenticated()
    const record = own.find((r) => r.id === params.id)
    return record ? HttpResponse.json(toDetails(record)) : notFound()
  }),

  http.get('*/api/records/:id/report', async ({ params }) => {
    await delay(300)
    const own = recordsForSession()
    if (!own) return unauthenticated()
    const record = own.find((r) => r.id === params.id)
    if (!record) return notFound()
    if (record.status !== 'CONCLUIDO') {
      return problem(
        409,
        'REGISTRO_NAO_CONCLUIDO',
        'O relatório fica disponível quando o registro for concluído.',
      )
    }
    return new HttpResponse(samplePdf(record.id), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="registro-${record.id}.pdf"`,
      },
    })
  }),

  http.get('*/api/records/:id/export', async ({ params }) => {
    await delay(300)
    const own = recordsForSession()
    if (!own) return unauthenticated()
    const record = own.find((r) => r.id === params.id)
    if (!record) return notFound()
    if (record.status !== 'CONCLUIDO') {
      return problem(
        409,
        'REGISTRO_NAO_CONCLUIDO',
        'O arquivo .zip fica disponível quando o registro for concluído.',
      )
    }
    return new HttpResponse(EMPTY_ZIP, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="registro-${record.id}.zip"`,
      },
    })
  }),
]
