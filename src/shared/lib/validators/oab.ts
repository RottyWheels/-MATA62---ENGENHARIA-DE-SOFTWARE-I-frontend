import { onlyDigits } from './digits'
import { isValidUf, type UF } from './uf'

/**
 * Número de inscrição na OAB: até 6 dígitos (sem a UF).
 * Formato enviado ao backend: `"<numero>/<UF>"` — PROVISÓRIO, a confirmar (README, pendência 8).
 */
export function isValidOabNumber(value: string): boolean {
  return /^\d{1,6}$/.test(value.trim())
}

export function formatOab(numero: string, uf: UF): string {
  return `${onlyDigits(numero)}/${uf}`
}

export function parseOab(value: string): { numero: string; uf: UF } | null {
  const match = /^(\d{1,6})\/([A-Z]{2})$/.exec(value.trim().toUpperCase())
  if (!match?.[1] || !match[2] || !isValidUf(match[2])) return null
  return { numero: match[1], uf: match[2] }
}
