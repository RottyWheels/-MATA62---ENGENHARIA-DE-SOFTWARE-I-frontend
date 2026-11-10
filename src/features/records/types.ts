/** Registro realizado (Apêndice A) — formato provisório até o contrato do backend. */
export type RecordStatus = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'INTERROMPIDO' | 'FALHOU'

export type RecordSummary = {
  id: string
  title: string
  startedAt: string
  finishedAt: string | null
  details: string
  status: RecordStatus
}
