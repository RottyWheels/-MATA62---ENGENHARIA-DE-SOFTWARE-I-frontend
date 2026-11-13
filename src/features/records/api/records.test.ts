import { describe, expect, it } from 'vitest'

import { completeMockRecord } from '@/mocks/handlers/records'
import { loginAsDemo, loginAsNewUser } from '@/test/session'

import { getRecord, getRecordFile, getRecords, isRecordPending } from './records'

describe('API de registros (mocks)', () => {
  it('pagina do mais recente para o mais antigo', async () => {
    await loginAsDemo()

    const first = await getRecords({ page: 0, size: 10 })
    const last = await getRecords({ page: 2, size: 10 })

    expect(first).toMatchObject({ page: 0, size: 10, totalElements: 25, totalPages: 3 })
    expect(first.content).toHaveLength(10)
    expect(last.content).toHaveLength(5)
    const dates = first.content.map((r) => r.startedAt)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('filtra por status e busca no título e na URL', async () => {
    await loginAsDemo()

    const failed = await getRecords({ status: 'FALHOU' })
    expect(failed.totalElements).toBe(2)
    expect(failed.content.every((r) => r.status === 'FALHOU')).toBe(true)

    const byUrl = await getRecords({ q: 'LOJA-EXEMPLO' })
    expect(byUrl.totalElements).toBeGreaterThan(0)
    expect(byUrl.content.every((r) => r.url.includes('loja-exemplo'))).toBe(true)

    const nothing = await getRecords({ q: 'não existe' })
    expect(nothing).toMatchObject({ totalElements: 0, content: [] })
  })

  it('traz os hashes só depois de concluído', async () => {
    await loginAsDemo()
    const [latest] = (await getRecords({ size: 1 })).content
    expect(latest?.status).toBe('PROCESSANDO')

    const processing = await getRecord(latest!.id)
    expect(isRecordPending(processing.status)).toBe(true)
    expect(processing.files.every((f) => f.sha256 === null)).toBe(true)

    completeMockRecord(latest!.id)
    const done = await getRecord(latest!.id)
    expect(done.status).toBe('CONCLUIDO')
    expect(done.files.every((f) => /^[0-9a-f]{64}$/.test(f.sha256 ?? ''))).toBe(true)
  })

  it('baixa o relatório em PDF de um registro concluído', async () => {
    await loginAsDemo()
    const done = (await getRecords({ status: 'CONCLUIDO', size: 1 })).content[0]!

    const pdf = await getRecordFile('report', done.id)

    expect(pdf.type).toBe('application/pdf')
    expect(await pdf.text()).toMatch(/^%PDF-1\.4/)
  })

  it('conta nova não tem registros', async () => {
    await loginAsNewUser('nova@veridt.test')

    expect(await getRecords({})).toMatchObject({ totalElements: 0, content: [] })
  })
})
