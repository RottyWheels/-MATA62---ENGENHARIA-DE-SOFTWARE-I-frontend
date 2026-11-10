// API pública da feature de créditos (módulo `credits` do backend, REQ 05–07).
// As páginas não são exportadas aqui: o router as carrega sob demanda (lazy).

export type {
  BillingInfo,
  CreditPackage,
  CreditPackageId,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PurchaseRequest,
} from './api/types'
export { CREDITS_ENDPOINTS } from './api/endpoints'
