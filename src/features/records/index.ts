// API pública da feature de registros (módulo `records` do backend, REQ 12–15).
// As páginas não são exportadas aqui: o router as carrega sob demanda (lazy).

export type {
  Page,
  RecordDetails,
  RecordFile,
  RecordFileKind,
  RecordsQuery,
  RecordStatus,
  RecordSummary,
} from './api/types'
export { RECORDS_ENDPOINTS } from './api/endpoints'
export { getRecordQueryKey, getRecordsQueryKey } from './api/records'
