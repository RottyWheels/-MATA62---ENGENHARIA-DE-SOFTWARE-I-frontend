import { DownloadIcon } from 'lucide-react'
import type { RefObject } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { formatFileSize } from '@/shared/lib/format'

import type { RecordDetails } from '../api/types'
import { formatUtc } from '../lib/details'
import { formatRecordId, RECORD_STATUS_LABEL } from '../lib/status'

type Props = {
  record: RecordDetails
  open: boolean
  onOpenChange: (open: boolean) => void
  downloading: boolean
  onDownload: () => void
  /** Aberto por estado, não por um `DialogTrigger`: diz onde devolver o foco ao fechar. */
  returnFocusTo?: RefObject<HTMLElement | null>
}

/**
 * Prévia do relatório (REQ 14), montada com os dados do registro. O PDF de
 * verdade vem do backend em "Baixar PDF": a CSP não deixa exibir um PDF dentro
 * da página (`frame-src`/`object-src`), e a prévia em HTML é acessível.
 */
export function RecordReportDialog({
  record,
  open,
  onOpenChange,
  downloading,
  onDownload,
  returnFocusTo,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          if (!returnFocusTo?.current) return
          event.preventDefault()
          returnFocusTo.current.focus()
        }}
      >
        <DialogHeader className="border-b p-5">
          <DialogTitle>Relatório do registro {formatRecordId(record.id)}</DialogTitle>
          <DialogDescription>Prévia do conteúdo do PDF.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto bg-muted p-4 sm:p-6">
          <article
            aria-label="Prévia do relatório"
            className="mx-auto flex max-w-xl flex-col gap-5 bg-background p-6 text-xs leading-relaxed shadow-sm sm:p-8"
          >
            <header className="flex items-center justify-between border-b-2 border-primary pb-3">
              <span className="text-base font-bold text-accent-foreground">Veridt</span>
              <span className="text-muted-foreground">
                Relatório de registro de conteúdo digital
              </span>
            </header>

            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold">{record.title}</p>
              <p className="font-mono break-all text-muted-foreground">
                Registro {formatRecordId(record.id)} · {record.url}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Responsável</dt>
                <dd>{record.responsible}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{RECORD_STATUS_LABEL[record.status]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Início</dt>
                <dd className="font-mono">{formatUtc(record.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fim</dt>
                <dd className="font-mono">
                  {record.finishedAt ? formatUtc(record.finishedAt) : '—'}
                </dd>
              </div>
            </dl>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Arquivos e hashes SHA-256</h3>
              <ul className="flex flex-col gap-2">
                {record.files.map((file) => (
                  <li key={file.name} className="flex flex-col gap-0.5 rounded border p-2">
                    <span className="font-medium">
                      {file.name}{' '}
                      <span className="font-normal text-muted-foreground">
                        · {formatFileSize(file.sizeBytes)} · {formatUtc(file.capturedAt)}
                      </span>
                    </span>
                    <span className="font-mono break-all">{file.sha256 ?? 'pendente'}</span>
                  </li>
                ))}
              </ul>
            </section>

            <p className="border-t pt-3 text-muted-foreground">
              Para conferir a integridade, calcule o SHA-256 de cada arquivo do .zip e compare com
              os valores acima. Qualquer alteração no arquivo muda o hash.
            </p>
          </article>
        </div>

        <DialogFooter className="border-t p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={onDownload} disabled={downloading}>
            <DownloadIcon aria-hidden />
            {downloading ? 'Baixando…' : 'Baixar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
