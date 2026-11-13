/**
 * Contrato de registros (REQ 12 a 15). PROVISÓRIO: o módulo `records` do backend
 * ainda não existe. Escrito no formato que o orval geraria.
 */

/**
 * `EM_ANDAMENTO`: a sessão de captura está aberta. `PROCESSANDO`: os arquivos
 * estão sendo salvos e recebendo o hash. Um registro cancelado não é criado.
 */
export type RecordStatus = 'EM_ANDAMENTO' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHOU'

export type RecordFileKind = 'IMAGEM' | 'VIDEO'

export type RecordSummary = {
  /** Número do registro, mostrado como `#000127`. */
  id: string
  title: string
  /** Endereço registrado. */
  url: string
  status: RecordStatus
  /** ISO 8601 (UTC). */
  startedAt: string
  /** ISO 8601 (UTC); `null` enquanto a sessão está aberta. */
  finishedAt: string | null
}

export type RecordFile = {
  name: string
  kind: RecordFileKind
  sizeBytes: number
  /** SHA-256 em hexadecimal; `null` enquanto o registro é processado. */
  sha256: string | null
  /** ISO 8601 (UTC). */
  capturedAt: string
}

export type RecordDetails = RecordSummary & {
  /** Nome de quem fez o registro. */
  responsible: string
  files: RecordFile[]
  /** Só em `FALHOU`: o motivo, em português, para mostrar ao usuário. */
  failureReason?: string
  /** Só em `FALHOU`: se o crédito do registro voltou ao saldo. */
  creditRefunded?: boolean
}

/** Página no formato do Spring Data (`Page<T>`); `page` começa em 0. */
export type Page<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type RecordsQuery = {
  page?: number
  size?: number
  status?: RecordStatus
  /** Busca no título e na URL. */
  q?: string
  /** Início do período, ISO 8601. */
  from?: string
}
