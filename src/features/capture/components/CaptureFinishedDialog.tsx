import { CheckIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { formatNumber } from '@/shared/lib/format'

import type { Capture } from '../api/types'
import { describeCaptured } from '../lib/describe'

type Props = {
  capture: Capture
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Saldo depois da conclusão; `undefined` quando o backend não informa. */
  balance: number | undefined
}

/** Registro concluído (canvas: "Novo Registro · enviado para processamento"). */
export function CaptureFinishedDialog({ capture, open, onOpenChange, balance }: Props) {
  const credits = `${formatNumber(capture.cost)}${balance !== undefined ? ` (saldo: ${formatNumber(balance)})` : ''}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="items-start gap-3">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <CheckIcon className="size-5" />
          </span>
          <DialogTitle className="text-xl">Registro enviado para processamento</DialogTitle>
          <DialogDescription className="text-left">
            Os arquivos estão sendo preparados e cada um receberá um hash SHA-256. Você receberá um
            e-mail quando o registro estiver concluído; isso costuma levar poucos minutos.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/60 p-4 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Registro</dt>
            <dd className="font-mono">{capture.recordId ? `#${capture.recordId}` : '—'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Arquivos</dt>
            <dd>{describeCaptured(capture.screenshots.length, capture.recordings)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Crédito usado</dt>
            <dd>{credits}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Processando
              </span>
            </dd>
          </div>
        </dl>

        <DialogFooter>
          <Button asChild variant="secondary">
            <Link to="/capturas/nova">Novo registro</Link>
          </Button>
          {capture.recordId && (
            <Button asChild>
              <Link to={`/registros/${capture.recordId}`}>Ver registro</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
