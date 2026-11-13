import { describe, expect, it } from 'vitest'

import { formatDuration } from './time'

describe('formatDuration', () => {
  it('mostra minutos e segundos, e as horas só quando passa de uma', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(42.9)).toBe('00:42')
    expect(formatDuration(600)).toBe('10:00')
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  it('nunca fica negativo (relógios fora de sincronia)', () => {
    expect(formatDuration(-3)).toBe('00:00')
  })
})
