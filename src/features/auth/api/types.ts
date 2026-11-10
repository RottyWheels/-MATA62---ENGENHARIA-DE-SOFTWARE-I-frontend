/**
 * Tipos do contrato de autenticação — PROVISÓRIO, a confirmar com o backend.
 * Escritos no formato que o orval geraria, para a troca pelo cliente gerado ser direta.
 */

export type UserType = 'ADVOGADO' | 'COMUM'

export type User = {
  id: string
  fullName: string
  email: string
  type: UserType
  creditBalance: number
  /** Só dígitos. Pré-preenche o faturamento (Figma). Provisório: confirmar com o backend. */
  cpf?: string
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
  /** Obrigatório se `type === 'ADVOGADO'`. Formato provisório: `"<numero>/<UF>"`. */
  oabNumber?: string
}

export type PasswordResetRequest = {
  email: string
}
