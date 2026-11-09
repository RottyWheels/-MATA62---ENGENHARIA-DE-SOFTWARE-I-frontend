import { onlyDigits } from './digits'

/** Máscara dinâmica (fixo e celular) para o react-imask. */
export const PHONE_MASKS = [{ mask: '(00) 0000-0000' }, { mask: '(00) 00000-0000' }]

// DDD: dois dígitos de 1 a 9 (não existe DDD com 0).
const LANDLINE = /^[1-9]{2}[2-5]\d{7}$/
const MOBILE = /^[1-9]{2}9\d{8}$/

export function isValidLandline(value: string): boolean {
  return LANDLINE.test(onlyDigits(value))
}

export function isValidMobile(value: string): boolean {
  return MOBILE.test(onlyDigits(value))
}

/** Telefone brasileiro com DDD: fixo (10 dígitos) ou celular (11 dígitos, começando com 9). */
export function isValidPhone(value: string): boolean {
  return isValidLandline(value) || isValidMobile(value)
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
}
