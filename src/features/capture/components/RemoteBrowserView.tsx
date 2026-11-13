import { LockIcon } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

import type { CaptureFrame, ClientMessage } from '../types'

/** Converte a posição do mouse no canvas (CSS) para o viewport remoto. */
function toRemotePoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  const x = ((clientX - rect.left) * canvas.width) / rect.width
  const y = ((clientY - rect.top) * canvas.height) / rect.height
  return { x: Math.round(x), y: Math.round(y) }
}

type Props = {
  /** Endereço mostrado na barra do navegador. */
  url: string
  /** Último quadro recebido pelo WebSocket. */
  frame: CaptureFrame | null
  /** Envia mouse, rolagem e teclado ao navegador remoto. */
  send: (message: ClientMessage) => boolean
  /** Aceita interação (site aberto). */
  interactive: boolean
  /** Conteúdo por cima do quadro: abrindo o site, erro, sessão encerrada. */
  overlay?: ReactNode
  /** Destaque de gravação em andamento (moldura azul, canvas "Gravando"). */
  recording?: boolean
}

/**
 * O navegador remoto: barra de endereço e o último quadro do site, num canvas
 * que repassa mouse, rolagem e teclado. Só exibe; quem cuida do WebSocket e do
 * estado da sessão é a página.
 */
export function RemoteBrowserView({ url, frame, send, interactive, overlay, recording }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pendingMove = useRef<{ x: number; y: number } | null>(null)
  const moveFrame = useRef<number | null>(null)

  // Desenha o quadro (JPEG base64). O canvas assume o tamanho do viewport remoto.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame) return
    const image = new Image()
    image.onload = () => {
      if (canvas.width !== frame.width) canvas.width = frame.width
      if (canvas.height !== frame.height) canvas.height = frame.height
      canvas.getContext('2d')?.drawImage(image, 0, 0, frame.width, frame.height)
    }
    image.src = `data:image/jpeg;base64,${frame.data}`
  }, [frame])

  // `wheel` precisa de listener não passivo para impedir a rolagem da página.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !interactive) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      send({ type: 'wheel', deltaX: event.deltaX, deltaY: event.deltaY })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [send, interactive])

  useEffect(
    () => () => {
      if (moveFrame.current !== null) cancelAnimationFrame(moveFrame.current)
    },
    [],
  )

  const handleMouse = (action: 'down' | 'up') => (event: MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return
    if (action === 'down') event.currentTarget.focus()
    const { x, y } = toRemotePoint(event.currentTarget, event.clientX, event.clientY)
    send({ type: 'mouse', action, x, y, button: event.button })
  }

  // Movimento limitado a um envio por quadro de animação.
  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return
    pendingMove.current = toRemotePoint(event.currentTarget, event.clientX, event.clientY)
    if (moveFrame.current !== null) return
    moveFrame.current = requestAnimationFrame(() => {
      moveFrame.current = null
      if (pendingMove.current) send({ type: 'mouse', action: 'move', ...pendingMove.current })
    })
  }

  const handleKey = (action: 'down' | 'up') => (event: KeyboardEvent<HTMLCanvasElement>) => {
    // Tab continua navegando pela página para não prender o foco.
    if (!interactive || event.key === 'Tab') return
    event.preventDefault()
    send({ type: 'key', action, key: event.key, code: event.code })
  }

  return (
    <div className={cn('rounded-xl', recording && 'bg-blue-700 p-[3px]')}>
      <div className="overflow-hidden rounded-[10px] border bg-background">
        <div className="flex items-center gap-3 border-b bg-muted px-3.5 py-2.5">
          <div aria-hidden className="hidden gap-1.5 sm:flex">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 py-1.5">
            <LockIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs sm:text-sm" title={url}>
              {url}
            </span>
          </div>
          <span className="hidden text-xs text-muted-foreground md:inline">
            Navegador seguro do Veridt
          </span>
        </div>

        <div className="relative aspect-video bg-muted">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            tabIndex={interactive ? 0 : -1}
            aria-label="Navegador remoto. Clique para interagir; use Tab para sair."
            className="block h-full w-full cursor-default outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onMouseDown={handleMouse('down')}
            onMouseUp={handleMouse('up')}
            onMouseMove={handleMouseMove}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={handleKey('down')}
            onKeyUp={handleKey('up')}
          />
          {overlay && (
            <div
              data-slot="browser-overlay"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/95 px-6 text-center"
            >
              {overlay}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
