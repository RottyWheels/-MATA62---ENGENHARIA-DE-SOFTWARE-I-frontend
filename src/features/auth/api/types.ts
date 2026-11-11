/**
 * Tipos do contrato de autenticação, conforme o backend (branch `desenv`, módulo `identity`).
 * Escritos no formato que o orval geraria, para a troca pelo cliente gerado ser direta.
 */

export type UserType = 'ADVOGADO' | 'COMUM'

export type OabRegistrationType = 'PRINCIPAL' | 'SUPLEMENTAR' | 'ESTAGIARIO'

export type OabRegistration = {
  /** Até 6 dígitos. */
  number: string
  /** Sigla da UF. */
  state: string
  type: OabRegistrationType
}

/** `UserResponse` do backend. Nunca traz senha nem CPF. */
export type User = {
  id: string
  fullName: string
  email: string
  type: UserType
  oabRegistrations: OabRegistration[]
  createdAt: string
  /**
   * Saldo de créditos. PROVISÓRIO: o módulo `credits` do backend ainda não existe,
   * então `GET /api/me` não traz este campo (só os mocks).
   */
  creditBalance?: number
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  type: UserType
  fullName: string
  email: string
  password: string
  /** Só dígitos. */
  cpf: string
  /** Obrigatório para advogado e proibido para usuário comum. */
  oabRegistrations?: OabRegistration[]
}

export type PasswordResetRequest = {
  email: string
}

export type PasswordResetConfirmRequest = {
  /** Token recebido no link do e-mail (`?token=`). */
  token: string
  newPassword: string
}
