import { onlyDigits } from './digits'

export const CEP_MASK = '00000-000'

/** Aceita `00000-000` ou 8 dígitos. */
export function isValidCep(value: string): boolean {
  return /^\d{5}-?\d{3}$/.test(value.trim())
}

export function formatCep(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2')
}
