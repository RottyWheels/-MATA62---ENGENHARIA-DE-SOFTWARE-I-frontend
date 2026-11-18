/** Caminhos da API de créditos (backend, módulo `credits`, branch `feature/credits`). */
export const CREDITS_ENDPOINTS = {
  packages: '/api/credits/packages',
  balance: '/api/credits/balance',
  purchases: '/api/credits/purchases',
  payments: '/api/credits/payments',
  payment: (id: string) => `/api/credits/payments/${encodeURIComponent(id)}`,
} as const
