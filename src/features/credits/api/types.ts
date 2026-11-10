/**
 * Tipos do módulo `credits` (REQ 05–07, Apêndice A) — contrato PROVISÓRIO,
 * no formato que o orval geraria. Confirmar com o backend.
 */

export type CreditPackageId = 'BASICO' | 'MEDIO' | 'PREMIUM'

/** Pacote de créditos: nome, quantidade, valor por crédito e benefícios (Apêndice A). */
export type CreditPackage = {
  id: CreditPackageId
  name: string
  credits: number
  /** Em reais. */
  pricePerCredit: number
  /** Em reais. */
  price: number
  description: string
}

export type PaymentMethod = 'PIX' | 'MERCADO_PAGO'

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

/** Dados da compra do pacote (Apêndice A). */
export type BillingInfo = {
  fullName: string
  email: string
  /** Só dígitos. */
  phone: string
  /** Só dígitos. */
  cpf: string
  /** Só dígitos. */
  cep: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  /** Sigla da UF. */
  state: string
}

export type PurchaseRequest = {
  packageId: CreditPackageId
  method: PaymentMethod
  billing: BillingInfo
}

export type PixData = {
  /** Imagem do QR Code como data URL (ex.: `data:image/png;base64,...`). */
  qrCodeImage: string
  /** Código "copia e cola". */
  copyPaste: string
  /** ISO 8601. */
  expiresAt: string
}

export type Payment = {
  id: string
  packageId: CreditPackageId
  method: PaymentMethod
  status: PaymentStatus
  /** Em reais. */
  amount: number
  credits: number
  /** ISO 8601. */
  createdAt: string
  /** Presente quando `method === 'PIX'`. */
  pix?: PixData
  /** Mercado Pago: URL do checkout para onde o usuário é levado. */
  checkoutUrl?: string
}
