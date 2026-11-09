import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDate, formatDateTime, formatFileSize } from './format'

// Intl usa espaço não separável entre "R$" e o valor.
const normalize = (value: string) => value.replace(/\s/g, ' ')

describe('format', () => {
  it('formata moeda em BRL', () => {
    expect(normalize(formatCurrency(1234.5))).toBe('R$ 1.234,50')
  })

  it('formata datas em pt-BR', () => {
    expect(formatDate('2026-11-09T14:32:00')).toBe('09/11/2026')
    expect(formatDateTime('2026-11-09T14:32:00')).toBe('09/11/2026 às 14:32')
    expect(formatDate('não é data')).toBe('—')
  })

  it('formata tamanho de arquivo', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1536)).toBe('1,5 KB')
    expect(formatFileSize(25 * 1024 * 1024)).toBe('25 MB')
    expect(formatFileSize(-1)).toBe('—')
  })
})
