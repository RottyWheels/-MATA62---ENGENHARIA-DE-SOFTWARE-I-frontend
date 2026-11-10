/** Caminhos da API de créditos — contrato PROVISÓRIO, a confirmar com o backend. */
export const CREDITS_ENDPOINTS = {
  packages: '/api/credits/packages',
  purchases: '/api/credits/purchases',
  payment: (id: string) => `/api/credits/payments/${encodeURIComponent(id)}`,
} as const
