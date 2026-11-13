import { useMutation } from '@tanstack/react-query'
import { DownloadIcon, FileTextIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/shared/api/problem-detail'
import { Button } from '@/shared/components/ui/button'
import { saveBlob } from '@/shared/lib/download'

import { getRecordFile } from '../api/records'
import type { RecordDetails } from '../api/types'
import { RecordReportDialog } from './RecordReportDialog'

/** Botões "Gerar relatório" e "Fazer download (.zip)" do painel de detalhes (REQ 14 e 15). */
export function RecordDownloads({ record }: { record: RecordDetails }) {
  const [reportOpen, setReportOpen] = useState(false)
  const reportButton = useRef<HTMLButtonElement>(null)
  const ready = record.status === 'CONCLUIDO'

  const download = useMutation({
    mutationFn: (kind: 'report' | 'export') => getRecordFile(kind, record.id),
    onSuccess: (blob, kind) =>
      saveBlob(blob, `registro-${record.id}.${kind === 'report' ? 'pdf' : 'zip'}`),
    onError: (error) =>
      toast.error('Não foi possível baixar o arquivo', {
        description: getErrorMessage(error),
      }),
  })
  const busy = (kind: 'report' | 'export') => download.isPending && download.variables === kind

  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={reportButton}
        disabled={!ready}
        aria-describedby={ready ? undefined : 'acoes-indisponiveis'}
        onClick={() => setReportOpen(true)}
      >
        <FileTextIcon aria-hidden />
        Gerar relatório
      </Button>
      <Button
        variant="outline"
        disabled={!ready || busy('export')}
        aria-describedby={ready ? undefined : 'acoes-indisponiveis'}
        onClick={() => download.mutate('export')}
      >
        <DownloadIcon aria-hidden />
        {busy('export') ? 'Baixando…' : 'Fazer download (.zip)'}
      </Button>
      <p
        id={ready ? undefined : 'acoes-indisponiveis'}
        className="text-center text-xs text-muted-foreground"
      >
        {ready
          ? 'O arquivo .zip traz as imagens, o vídeo e o relatório com os hashes.'
          : 'Disponíveis quando o registro estiver concluído.'}
      </p>

      <RecordReportDialog
        record={record}
        open={reportOpen}
        onOpenChange={setReportOpen}
        downloading={busy('report')}
        onDownload={() => download.mutate('report')}
        returnFocusTo={reportButton}
      />
    </div>
  )
}
