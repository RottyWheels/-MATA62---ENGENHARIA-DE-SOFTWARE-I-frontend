import { startOfDay, subDays } from 'date-fns'

import type { RecordsQuery, RecordStatus } from '../api/types'
import { isRecordStatus } from './status'

/** Registros por página. */
export const RECORDS_PAGE_SIZE = 10

export const PERIODS = [
  { value: 'todos', label: 'Todo o período', days: null },
  { value: '7d', label: 'Últimos 7 dias', days: 7 },
  { value: '30d', label: 'Últimos 30 dias', days: 30 },
  { value: '365d', label: 'Últimos 12 meses', days: 365 },
] as const

export type Period = (typeof PERIODS)[number]['value']

/** Filtros da lista, guardados na URL (`?q=&status=&periodo=&pagina=`). */
export type RecordsFilters = {
  q: string
  status: RecordStatus | 'todos'
  periodo: Period
  /** Começa em 1, como o usuário vê. */
  pagina: number
}

function isPeriod(value: string | null): value is Period {
  return PERIODS.some((p) => p.value === value)
}

export function readFilters(params: URLSearchParams): RecordsFilters {
  const status = params.get('status')
  const periodo = params.get('periodo')
  const pagina = Number(params.get('pagina'))
  return {
    q: params.get('q')?.trim() ?? '',
    status: isRecordStatus(status) ? status : 'todos',
    periodo: isPeriod(periodo) ? periodo : 'todos',
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  }
}

/** Escreve só o que difere do padrão, para a URL ficar curta. */
export function writeFilters(filters: RecordsFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status !== 'todos') params.set('status', filters.status)
  if (filters.periodo !== 'todos') params.set('periodo', filters.periodo)
  if (filters.pagina > 1) params.set('pagina', String(filters.pagina))
  return params
}

export function hasActiveFilters(filters: RecordsFilters) {
  return filters.q !== '' || filters.status !== 'todos' || filters.periodo !== 'todos'
}

/** Converte os filtros na consulta da API. `now` é parâmetro para os testes. */
export function toRecordsQuery(filters: RecordsFilters, now = new Date()): RecordsQuery {
  const days = PERIODS.find((p) => p.value === filters.periodo)?.days ?? null
  const query: RecordsQuery = { page: filters.pagina - 1, size: RECORDS_PAGE_SIZE }
  if (filters.q) query.q = filters.q
  if (filters.status !== 'todos') query.status = filters.status
  // Início do dia: a chave da consulta não muda a cada renderização.
  if (days !== null) query.from = startOfDay(subDays(now, days)).toISOString()
  return query
}
