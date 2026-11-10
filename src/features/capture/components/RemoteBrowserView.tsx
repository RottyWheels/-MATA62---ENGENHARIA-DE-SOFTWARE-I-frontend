import { CameraIcon, SquareIcon } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

import { useCaptureSocket } from '../hooks/useCaptureSocket'
import type { SocketStatus } from '../types'

const STATUS_LABEL: Record<SocketStatus, string> = {
  connecting: 'Conectando…',
  open: 'Conectado',
  closed: 'Desconectado',
  error: 'Erro de conexão',
}

/** Converte a posição do mouse no canvas (CSS) para o viewport remoto. */
function toRemotePoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  const x = ((clientX - rect.left) * canvas.width) / rect.width
  const y = ((clientY - rect.top) * canvas.height) / rect.height
  return { x: Math.round(x), y: Math.round(y) }
}

/**
 * Esqueleto do navegador remoto ao vivo: desenha o último quadro recebido
 * e repassa mouse, rolagem e teclado ao backend. Sem regra de negócio.
 */
export function RemoteBrowserView({ sessionId }: { sessionId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pendingMove = useRef<{ x: number; y: number } | null>(null)
  const moveFrame = useRef<number | null>(null)
  const { status, captureStatus, lastFrame, send } = useCaptureSocket(sessionId)

  // Desenha o quadro (JPEG base64). O canvas assume o tamanho do viewport remoto.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !lastFrame) return
    const image = new Image()
    image.onload = () => {
      if (canvas.width !== lastFrame.width) canvas.width = lastFrame.width
      if (canvas.height !== lastFrame.height) canvas.height = lastFrame.height
      canvas.getContext('2d')?.drawImage(image, 0, 0, lastFrame.width, lastFrame.height)
    }
    image.src = `data:image/jpeg;base64,${lastFrame.data}`
  }, [lastFrame])

  // `wheel` precisa de listener não passivo para impedir a rolagem da página.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      send({ type: 'wheel', deltaX: event.deltaX, deltaY: event.deltaY })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [send])

  useEffect(
    () => () => {
      if (moveFrame.current !== null) cancelAnimationFrame(moveFrame.current)
    },
    [],
  )

  const handleMouse = (action: 'down' | 'up') => (event: MouseEvent<HTMLCanvasElement>) => {
    if (action === 'down') event.currentTarget.focus()
    const { x, y } = toRemotePoint(event.currentTarget, event.clientX, event.clientY)
    send({ type: 'mouse', action, x, y, button: event.button })
  }

  // Movimento limitado a um envio por quadro de animação.
  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    pendingMove.current = toRemotePoint(event.currentTarget, event.clientX, event.clientY)
    if (moveFrame.current !== null) return
    moveFrame.current = requestAnimationFrame(() => {
      moveFrame.current = null
      if (pendingMove.current) send({ type: 'mouse', action: 'move', ...pendingMove.current })
    })
  }

  const handleKey = (action: 'down' | 'up') => (event: KeyboardEvent<HTMLCanvasElement>) => {
    // Tab continua navegando pela página para não prender o foco.
    if (event.key === 'Tab') return
    event.preventDefault()
    send({ type: 'key', action, key: event.key, code: event.code })
  }

  const isOpen = status === 'open'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2" aria-live="polite">
          <Badge variant={isOpen ? 'default' : 'secondary'}>{STATUS_LABEL[status]}</Badge>
          {captureStatus && <Badge variant="outline">{captureStatus}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!isOpen}
            onClick={() => send({ type: 'screenshot' })}
          >
            <CameraIcon />
            Capturar tela
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!isOpen}
            onClick={() => send({ type: 'finish' })}
          >
            <SquareIcon />
            Concluir
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border bg-muted">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          tabIndex={0}
          aria-label="Navegador remoto. Clique para interagir; use Tab para sair."
          className="block h-auto w-full cursor-default outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onMouseDown={handleMouse('down')}
          onMouseUp={handleMouse('up')}
          onMouseMove={handleMouseMove}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={handleKey('down')}
          onKeyUp={handleKey('up')}
        />
        {!lastFrame && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Aguardando imagem do navegador remoto…
          </p>
        )}
      </div>
    </div>
  )
}
