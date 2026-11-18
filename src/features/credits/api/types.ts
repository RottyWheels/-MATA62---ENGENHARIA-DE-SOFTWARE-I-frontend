/**
 * Tipos do módulo `credits` (REQ 05–07, Apêndice A), conforme o backend (branch `feature/credits`),
 * no formato que o orval geraria.
 */

export type CreditPackageId = 'BASICO' | 'MEDIO' | 'PREMIUM'

/** Pacote de créditos: nome, quantidade, valor por crédito e benefícios (Apêndice A). Valores provisórios. */
export type CreditPackage = {
  id: CreditPackageId
  name: string
  credits: number
  /** Em reais. */
  pricePerCredit: number
  /** Total em reais, calculado no servidor. */
  price: number
  description: string
}

export type PaymentMethod = 'PIX' | 'MERCADO_PAGO'

/** Status do pedido, em português como no backend. */
export type PaymentStatus = 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'EXPIRADO'

/** Dados da compra do pacote (Apêndice A). Nunca voltam nas respostas. */
export type BillingInfo = {
  fullName: string
  email: string
  /** 10 ou 11 dígitos, com DDD. */
  phone: string
  /** Só dígitos (o backend também aceita com máscara). */
  cpf: string
  /** 8 dígitos. */
  cep: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  /** Sigla da UF. */
  state: string
}

/** Não há campo de valor: o total vem sempre do pacote, no servidor. */
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

/** Pedido de compra. Campos ausentes não vêm no JSON (nunca `null`). */
export type Payment = {
  id: string
  packageId: CreditPackageId
  packageName: string
  method: PaymentMethod
  status: PaymentStatus
  /** Total em reais. */
  amount: number
  credits: number
  /** ISO 8601. */
  createdAt: string
  /** ISO 8601. Só depois de aprovado ou recusado. */
  decidedAt?: string
  /** Só no Pix. */
  pix?: PixData
  /** Só no Mercado Pago: URL do checkout para onde o usuário é levado. */
  checkoutUrl?: string
}

/** `GET /api/credits/balance`. O saldo não vem em `GET /api/me` (identity não depende de credits). */
export type Balance = {
  balance: number
}

/** `GET /api/credits/payments`: pedidos do usuário, do mais recente para o mais antigo. */
export type PaymentPage = {
  items: Payment[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** `POST /api/credits/payments/{id}/simulation` (só no backend de desenvolvimento). */
export type PaymentSimulationRequest = {
  approved: boolean
}
