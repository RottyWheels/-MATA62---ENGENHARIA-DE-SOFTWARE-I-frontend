// API pública da feature de créditos (módulo `credits` do backend, REQ 05–07).
// As páginas não são exportadas aqui: o router as carrega sob demanda (lazy).

export { getBalanceQueryKey, useBalance, usePayments } from './api/credits'
export type {
  Balance,
  BillingInfo,
  CreditPackage,
  CreditPackageId,
  Payment,
  PaymentMethod,
  PaymentPage,
  PaymentSimulationRequest,
  PaymentStatus,
  PurchaseRequest,
} from './api/types'
export { CREDITS_ENDPOINTS } from './api/endpoints'
