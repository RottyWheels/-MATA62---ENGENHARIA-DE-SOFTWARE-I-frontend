import { describe, expect, it } from 'vitest'

import { describeFiles, formatUtc } from './details'
import { hasActiveFilters, readFilters, toRecordsQuery, writeFilters } from './filters'
import { pageNumbers } from './pagination'

describe('filtros da lista', () => {
  it('lê a URL e ignora valores inválidos', () => {
    expect(readFilters(new URLSearchParams('q= loja &status=FALHOU&periodo=7d&pagina=3'))).toEqual({
      q: 'loja',
      status: 'FALHOU',
      periodo: '7d',
      pagina: 3,
    })
    expect(readFilters(new URLSearchParams('status=QUALQUER&periodo=1d&pagina=-2'))).toEqual({
      q: '',
      status: 'todos',
      periodo: 'todos',
      pagina: 1,
    })
  })

  it('escreve só o que difere do padrão', () => {
    const filters = readFilters(new URLSearchParams())
    expect(writeFilters(filters).toString()).toBe('')
    expect(hasActiveFilters(filters)).toBe(false)
    expect(writeFilters({ ...filters, status: 'CONCLUIDO', pagina: 2 }).toString()).toBe(
      'status=CONCLUIDO&pagina=2',
    )
  })

  it('converte em consulta da API, com o período a partir do início do dia', () => {
    const now = new Date(2026, 10, 13, 15, 30)
    const query = toRecordsQuery({ q: 'loja', status: 'FALHOU', periodo: '7d', pagina: 2 }, now)
    expect(query).toEqual({
      page: 1,
      size: 10,
      q: 'loja',
      status: 'FALHOU',
      from: new Date(2026, 10, 6).toISOString(),
    })
  })
})

describe('paginação', () => {
  it('mostra todas as páginas até 7', () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3])
  })

  it('acima de 7, mostra a primeira, a última e as vizinhas, com intervalos', () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, 'gap', 20])
    expect(pageNumbers(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20])
    expect(pageNumbers(20, 20)).toEqual([1, 'gap', 19, 20])
  })
})

describe('detalhes', () => {
  it('descreve os arquivos do registro', () => {
    const file = (kind: 'IMAGEM' | 'VIDEO') => ({
      name: 'x',
      kind,
      sizeBytes: 1,
      sha256: null,
      capturedAt: '2026-11-12T12:00:00Z',
    })
    expect(describeFiles([file('IMAGEM'), file('IMAGEM'), file('VIDEO')])).toEqual({
      kind: 'Imagens e vídeo',
      count: 3,
      breakdown: '2 imagens, 1 vídeo',
    })
    expect(describeFiles([file('VIDEO')]).kind).toBe('Vídeo')
    expect(describeFiles([])).toEqual({ kind: 'Nenhum arquivo', count: 0, breakdown: '' })
  })

  it('mostra o horário em UTC, como no relatório', () => {
    expect(formatUtc('2026-11-12T12:12:04.000Z')).toBe('2026-11-12 12:12:04 UTC')
    expect(formatUtc('inválido')).toBe('—')
  })
})
