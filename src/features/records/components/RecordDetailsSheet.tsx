import { isAxiosError } from 'axios'
import { CircleAlertIcon, ClockIcon, CopyIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate, type To } from 'react-router'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatFileSize } from '@/shared/lib/format'

import { isRecordPending, useRecord } from '../api/records'
import type { RecordDetails } from '../api/types'
import { describeFiles, formatRecordTime } from '../lib/details'
import { formatRecordId } from '../lib/status'
import { RecordDownloads } from './RecordDownloads'
import { RecordStatusBadge } from './RecordStatusBadge'

type Props = {
  /** Registro aberto; sem id, o painel fica fechado. */
  id: string | undefined
  /** Para onde voltar ao fechar (a lista, com os mesmos filtros). */
  closeTo: To
}

/** Painel de detalhes sobre a lista (Figma "Lista dos Registros - Detalhes", REQ 13). */
export function RecordDetailsSheet({ id, closeTo }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  // Ao fechar, o id sai da URL, mas o painel ainda anima: guarda o último aberto
  // para continuar mostrando o registro (e para devolver o foco ao link dele).
  const [lastId, setLastId] = useState(id)
  if (id && id !== lastId) setLastId(id)
  const shownId = id ?? lastId
  const record = useRecord(shownId, { poll: !!id })
  const openedFromList = (location.state as { fromList?: boolean } | null)?.fromList === true

  // Aberto pela lista: fechar volta no histórico, e o "voltar" do navegador não
  // reabre o painel. Aberto por link direto (e-mail, favorito): vai para a lista.
  const close = () => {
    if (openedFromList) void navigate(-1)
    else void navigate(closeTo, { replace: true })
  }
  const notFound = isAxiosError(record.error) && record.error.response?.status === 404

  return (
    <Sheet
      open={!!id}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <SheetContent
        className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-md"
        onCloseAutoFocus={(event) => {
          // O painel abre pela URL, sem um SheetTrigger: o foco volta ao "Ver detalhes" dele.
          const link = document.querySelector<HTMLElement>(`[data-record-link="${shownId}"]`)
          if (!link) return
          event.preventDefault()
          link.focus()
        }}
      >
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-xl">
            Registro <span className="font-mono">{shownId ? formatRecordId(shownId) : ''}</span>
          </SheetTitle>
          <SheetDescription>Visualize os detalhes do registro abaixo.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
          {record.isPending ? (
            <div aria-busy className="flex flex-col gap-3">
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton key={index} className="h-5 w-full" />
              ))}
            </div>
          ) : record.isError ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>
                {notFound ? 'Registro não encontrado' : 'Não foi possível carregar o registro'}
              </AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                {notFound
                  ? 'Confira o endereço ou volte para a lista.'
                  : 'Verifique sua conexão e tente de novo.'}
                {!notFound && (
                  <Button variant="outline" size="sm" onClick={() => void record.refetch()}>
                    Tentar novamente
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <RecordDetailsBody record={record.data} />
          )}
        </div>

        {record.data && (
          <SheetFooter className="border-t p-6">
            <RecordDownloads record={record.data} />
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-2">
      <dt className="font-semibold">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function RecordDetailsBody({ record }: { record: RecordDetails }) {
  const files = describeFiles(record.files)

  const copy = async (name: string, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      toast.success('Hash copiado', { description: name })
    } catch {
      toast.error('Não foi possível copiar', { description: 'Selecione o hash e copie à mão.' })
    }
  }

  return (
    <>
      {isRecordPending(record.status) && (
        <Alert role="status">
          <ClockIcon />
          <AlertTitle>Registro em processamento</AlertTitle>
          <AlertDescription>
            Os arquivos estão sendo preparados. Você receberá um e-mail quando o registro estiver
            concluído; este painel se atualiza sozinho.
          </AlertDescription>
        </Alert>
      )}
      {record.status === 'FALHOU' && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>O registro falhou</AlertTitle>
          <AlertDescription>
            {record.failureReason ?? 'Não foi possível concluir o registro.'}
            {record.creditRefunded && ' O crédito usado foi devolvido ao seu saldo.'}
          </AlertDescription>
        </Alert>
      )}

      <dl className="flex flex-col gap-3 text-sm">
        <Field label="Status">
          <RecordStatusBadge status={record.status} />
        </Field>
        <Field label="Título">{record.title}</Field>
        <Field label="Site">
          <span className="font-mono text-xs break-all">{record.url}</span>
        </Field>
        <Field label="Data/hora início">
          <span className="font-mono text-xs">{formatRecordTime(record.startedAt)}</span>
        </Field>
        <Field label="Data/hora fim">
          <span className="font-mono text-xs">
            {record.finishedAt ? formatRecordTime(record.finishedAt) : '—'}
          </span>
        </Field>
        <Field label="Tipo de dados">{files.kind}</Field>
        <Field label="Imagens ou vídeos">
          {files.count}
          {files.breakdown && ` (${files.breakdown})`}
        </Field>
        <Field label="Usuário responsável">{record.responsible}</Field>
      </dl>

      {record.files.length > 0 && (
        <section aria-labelledby="hashes-titulo" className="flex flex-col gap-2">
          <h3 id="hashes-titulo" className="text-sm font-semibold">
            Integridade dos arquivos (SHA-256)
          </h3>
          {record.files.every((f) => f.sha256 === null) ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Os hashes aparecem aqui quando o processamento terminar.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {record.files.map((file) => (
                <li key={file.name} className="flex flex-col gap-1 rounded-md bg-accent p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-accent-foreground">
                      {file.name} · {formatFileSize(file.sizeBytes)}
                    </span>
                    {file.sha256 && (
                      <Button
                        variant="outline"
                        size="xs"
                        aria-label={`Copiar hash de ${file.name}`}
                        onClick={() => void copy(file.name, file.sha256 ?? '')}
                      >
                        <CopyIcon aria-hidden />
                        Copiar
                      </Button>
                    )}
                  </div>
                  <span className="font-mono text-xs break-all">{file.sha256 ?? 'pendente'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
