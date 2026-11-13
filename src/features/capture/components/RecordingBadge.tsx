import { useEffect, useState } from 'react'

import { formatDuration } from '../lib/time'

/** Selo "Gravando 00:42" (canvas: "Novo Registro · gravando"). */
export function RecordingBadge({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [])

  const elapsed = (now - new Date(startedAt).getTime()) / 1_000

  return (
    <div className="flex items-center gap-2.5 rounded-full bg-blue-100 px-3 py-1.5 text-blue-900">
      <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-blue-700" />
      <span className="text-sm font-semibold">Gravando</span>
      {/* O tempo muda a cada segundo: fica fora de regiões anunciadas, para não repetir. */}
      <span className="font-mono text-sm">{formatDuration(elapsed)}</span>
    </div>
  )
}
