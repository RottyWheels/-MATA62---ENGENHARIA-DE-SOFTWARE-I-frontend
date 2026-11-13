import { ImageIcon } from 'lucide-react'

import type { CaptureScreenshot } from '../api/types'
import { formatClock } from '../lib/time'

type Props = {
  screenshots: CaptureScreenshot[]
  /** Miniaturas tiradas do quadro na tela no momento da captura (só nesta aba). */
  thumbnails: Record<string, string>
}

/** "Capturas desta sessão (N)" (canvas: "Novo Registro · tela capturada"). */
export function ScreenshotStrip({ screenshots, thumbnails }: Props) {
  if (screenshots.length === 0) return null
  const last = screenshots.at(-1)?.name

  return (
    <section aria-labelledby="capturas-sessao" className="flex flex-col gap-2.5">
      <h2 id="capturas-sessao" className="text-sm font-semibold">
        Capturas desta sessão ({screenshots.length})
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {screenshots.map((shot) => {
          const thumbnail = thumbnails[shot.name]
          return (
            <li key={shot.name} className="flex w-40 shrink-0 flex-col gap-1.5">
              <div
                className={
                  shot.name === last
                    ? 'aspect-video overflow-hidden rounded-md border-2 border-primary bg-accent'
                    : 'aspect-video overflow-hidden rounded-md border bg-muted'
                }
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={`Miniatura de ${shot.name}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-muted-foreground">
                    <ImageIcon aria-hidden className="size-5" />
                  </span>
                )}
              </div>
              <span className="truncate font-mono text-xs" title={shot.name}>
                {shot.name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatClock(shot.capturedAt)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
