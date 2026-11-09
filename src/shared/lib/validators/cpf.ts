import { onlyDigits } from './digits'

export const CPF_MASK = '000.000.000-00'

function checkDigit(digits: number[]): number {
  const factor = digits.length + 1
  const sum = digits.reduce((acc, digit, index) => acc + digit * (factor - index), 0)
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

/** Valida o CPF (com ou sem máscara) pelos dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)
  return (
    checkDigit(digits.slice(0, 9)) === digits[9] && checkDigit(digits.slice(0, 10)) === digits[10]
  )
}

export function formatCpf(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}
