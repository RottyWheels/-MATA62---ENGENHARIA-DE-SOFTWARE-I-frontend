import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  return typeof value === 'string' ? parseISO(value) : new Date(value)
}

/** `09/11/2026` */
export function formatDate(value: DateInput, pattern = 'dd/MM/yyyy'): string {
  const date = toDate(value)
  return isValid(date) ? format(date, pattern, { locale: ptBR }) : '—'
}

/** `09/11/2026 às 14:32` */
export function formatDateTime(value: DateInput): string {
  return formatDate(value, "dd/MM/yyyy 'às' HH:mm")
}

/** `há 5 minutos` */
export function formatRelative(value: DateInput): string {
  const date = toDate(value)
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true, locale: ptBR }) : '—'
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** `R$ 1.234,56` */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

const integerFormatter = new Intl.NumberFormat('pt-BR')

/** `1.234` */
export function formatNumber(value: number): string {
  return integerFormatter.format(value)
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** `1,5 MB` (base 1024) */
/** Saldo de créditos; `—` enquanto o backend não informa o saldo. */
export function formatCredits(balance: number | undefined): string {
  return balance === undefined ? '—' : formatNumber(balance)
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024
    unit++
  }
  const digits = unit === 0 ? 0 : size < 10 ? 1 : 0
  const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(size)
  return `${formatted} ${UNITS[unit]}`
}
