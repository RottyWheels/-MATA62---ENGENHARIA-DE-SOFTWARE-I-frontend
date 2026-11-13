import type { RecordStatus } from '../api/types'

/** Rótulo de cada status, como aparece na tela e no filtro. */
export const RECORD_STATUS_LABEL: Record<RecordStatus, string> = {
  EM_ANDAMENTO: 'Em andamento',
  PROCESSANDO: 'Processando',
  CONCLUIDO: 'Concluído',
  FALHOU: 'Falhou',
}

/** Ordem dos status no filtro. */
export const RECORD_STATUSES: RecordStatus[] = [
  'CONCLUIDO',
  'PROCESSANDO',
  'EM_ANDAMENTO',
  'FALHOU',
]

/** Cores do selo: cada status também tem a palavra, a cor nunca está sozinha. */
export const RECORD_STATUS_CLASS: Record<RecordStatus, string> = {
  CONCLUIDO: 'bg-accent text-accent-foreground',
  PROCESSANDO: 'bg-amber-100 text-amber-800',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-900',
  FALHOU: 'bg-red-100 text-red-800',
}

export function isRecordStatus(value: string | null): value is RecordStatus {
  return value !== null && value in RECORD_STATUS_LABEL
}

/** `000127` → `#000127` */
export const formatRecordId = (id: string) => `#${id}`
