import { describe, expect, it } from 'vitest'

import { captureSocketUrl } from './hooks/useCaptureSocket'
import { parseServerMessage } from './types'

describe('protocolo da captura', () => {
  it('monta a URL do WebSocket na mesma origem', () => {
    expect(captureSocketUrl('abc', { protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173/ws/capture/abc',
    )
    expect(captureSocketUrl('a b', { protocol: 'https:', host: 'veridt.test' })).toBe(
      'wss://veridt.test/ws/capture/a%20b',
    )
  })

  it('interpreta mensagens válidas do servidor', () => {
    expect(parseServerMessage('{"type":"frame","data":"AAA","width":800,"height":600}')).toEqual({
      type: 'frame',
      data: 'AAA',
      width: 800,
      height: 600,
    })
    expect(parseServerMessage('{"type":"status","status":"FINISHED"}')).toEqual({
      type: 'status',
      status: 'FINISHED',
    })
  })

  it('descarta mensagens inválidas', () => {
    expect(parseServerMessage('não é json')).toBeNull()
    expect(parseServerMessage('{"type":"frame","data":1}')).toBeNull()
    expect(parseServerMessage('{"type":"status","status":"OUTRO"}')).toBeNull()
    expect(parseServerMessage(new ArrayBuffer(2))).toBeNull()
  })
})
