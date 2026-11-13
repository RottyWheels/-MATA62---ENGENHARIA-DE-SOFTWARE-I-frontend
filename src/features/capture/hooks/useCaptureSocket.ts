import { useCallback, useEffect, useRef, useState } from 'react'

import {
  isFinalCaptureStatus,
  parseServerMessage,
  type CaptureFrame,
  type CaptureStatus,
  type ClientMessage,
  type SocketStatus,
} from '../types'

const INITIAL_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 10_000

export function captureSocketUrl(
  sessionId: string,
  loc: Pick<Location, 'protocol' | 'host'> = window.location,
) {
  const protocol = loc.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${loc.host}/ws/capture/${encodeURIComponent(sessionId)}`
}

/**
 * Conexão com o navegador remoto da captura. Autenticada pelo cookie de sessão
 * (mesma origem). Reconecta com backoff exponencial até a captura terminar.
 */
export function useCaptureSocket(sessionId: string | undefined) {
  const [status, setStatus] = useState<SocketStatus>('connecting')
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus | null>(null)
  const [lastFrame, setLastFrame] = useState<CaptureFrame | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!sessionId) return

    let disposed = false
    let finished = false
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      const ws = new WebSocket(captureSocketUrl(sessionId))
      socketRef.current = ws

      ws.onopen = () => {
        attempt = 0
        setStatus('open')
      }
      ws.onmessage = (event: MessageEvent) => {
        const message = parseServerMessage(event.data)
        if (!message) return
        if (message.type === 'frame') {
          setLastFrame(message)
        } else {
          setCaptureStatus(message.status)
          if (isFinalCaptureStatus(message.status)) finished = true
        }
      }
      ws.onerror = () => setStatus('error')
      ws.onclose = () => {
        if (socketRef.current === ws) socketRef.current = null
        if (disposed || finished) {
          setStatus('closed')
          return
        }
        const wait = Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
        attempt++
        setStatus('closed')
        retryTimer = setTimeout(() => {
          setStatus('connecting')
          connect()
        }, wait)
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [sessionId])

  /** Envia um evento; retorna `false` se a conexão não estiver aberta. */
  const send = useCallback((message: ClientMessage) => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(message))
    return true
  }, [])

  return { status, captureStatus, lastFrame, send }
}
