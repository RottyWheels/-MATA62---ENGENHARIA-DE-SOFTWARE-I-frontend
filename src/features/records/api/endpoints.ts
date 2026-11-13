/** Caminhos da API de registros: contrato PROVISÓRIO, a confirmar com o backend. */
export const RECORDS_ENDPOINTS = {
  list: '/api/records',
  detail: (id: string) => `/api/records/${encodeURIComponent(id)}`,
  report: (id: string) => `/api/records/${encodeURIComponent(id)}/report`,
  export: (id: string) => `/api/records/${encodeURIComponent(id)}/export`,
} as const
