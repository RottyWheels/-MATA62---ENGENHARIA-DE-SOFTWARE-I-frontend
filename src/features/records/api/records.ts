import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { customInstance, type ErrorType } from '@/shared/api/http'
import type { ProblemDetail } from '@/shared/api/problem-detail'

import { RECORDS_ENDPOINTS } from './endpoints'
import type { Page, RecordDetails, RecordStatus, RecordSummary, RecordsQuery } from './types'

// Escrito à mão no formato do orval (funções + query keys + hooks).

export type RecordsError = ErrorType<ProblemDetail>

export const getRecords = (query: RecordsQuery, signal?: AbortSignal) =>
  customInstance<Page<RecordSummary>>({
    url: RECORDS_ENDPOINTS.list,
    method: 'GET',
    params: query,
    signal,
  })

export const getRecord = (id: string, signal?: AbortSignal) =>
  customInstance<RecordDetails>({ url: RECORDS_ENDPOINTS.detail(id), method: 'GET', signal })

/** Baixa um arquivo do registro (relatório em PDF ou pacote ZIP). */
export const getRecordFile = (kind: 'report' | 'export', id: string, signal?: AbortSignal) =>
  customInstance<Blob>({
    url: kind === 'report' ? RECORDS_ENDPOINTS.report(id) : RECORDS_ENDPOINTS.export(id),
    method: 'GET',
    responseType: 'blob',
    signal,
  })

export const getRecordsQueryKey = (query: RecordsQuery = {}) => ['records', 'list', query] as const
export const getRecordQueryKey = (id: string) => ['records', 'detail', id] as const

export function useRecords(query: RecordsQuery) {
  return useQuery<Page<RecordSummary>, RecordsError>({
    queryKey: getRecordsQueryKey(query),
    queryFn: ({ signal }) => getRecords(query, signal),
    // Mantém a página anterior na tela enquanto a próxima carrega.
    placeholderData: keepPreviousData,
  })
}

/** Intervalo de consulta enquanto o registro ainda não terminou. */
export const RECORD_POLL_MS = 5_000

export const isRecordPending = (status: RecordStatus | undefined) =>
  status === 'EM_ANDAMENTO' || status === 'PROCESSANDO'

/** Detalhes de um registro; consulta de novo enquanto ele estiver em andamento ou processando. */
export function useRecord(id: string | undefined) {
  return useQuery<RecordDetails, RecordsError>({
    queryKey: getRecordQueryKey(id ?? ''),
    queryFn: ({ signal }) => getRecord(id ?? '', signal),
    enabled: !!id,
    refetchInterval: (query) =>
      isRecordPending(query.state.data?.status) ? RECORD_POLL_MS : false,
  })
}
