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

/** `UserResponse` do backend. Nunca traz senha nem o CPF completo. */
export type User = {
  id: string
  fullName: string
  email: string
  type: UserType
  oabRegistrations: OabRegistration[]
  /** CPF já mascarado no servidor, ex.: `***.456.789-**`. */
  cpfMasked: string
  createdAt: string
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

export type ConfirmEmailRequest = {
  /** Token recebido no link do e-mail (`/confirmar-email?token=`). Nunca vai para logs. */
  token: string
}

export type ResendConfirmationRequest = {
  email: string
}
