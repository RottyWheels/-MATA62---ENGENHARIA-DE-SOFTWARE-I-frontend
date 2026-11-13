import { isAxiosError } from 'axios'
import type { ReactNode } from 'react'
import { CircleAlertIcon, LoaderCircleIcon, WifiOffIcon } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { getErrorMessage } from '@/shared/api/problem-detail'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Skeleton } from '@/shared/components/ui/skeleton'

import { useCapture, useCreateCapture } from '../api/capture'
import type { Capture } from '../api/types'
import { RemoteBrowserView } from '../components/RemoteBrowserView'
import { useCaptureSocket } from '../hooks/useCaptureSocket'
import { isFinalCaptureStatus, type CaptureStatus } from '../types'

/** Texto lido por leitores de tela quando o estado da sessão muda. */
const STATUS_ANNOUNCEMENT: Record<CaptureStatus, string> = {
  LOADING: 'Abrindo o site no navegador seguro.',
  READY: 'O site abriu. Você já pode capturar a tela ou iniciar a gravação.',
  RECORDING: 'Gravando a navegação.',
  LOAD_FAILED: 'Não foi possível abrir o site.',
  FINISHED: 'Registro enviado para processamento.',
  FAILED: 'A sessão de captura falhou.',
  CANCELED: 'Registro cancelado.',
}

/**
 * Sessão de captura (REQ 09–11): Figma "Criar Novo Registro" com o navegador.
 * O endereço `/capturas/:id/sessao` permite retomar a sessão ao recarregar.
 */
export function CaptureSessionPage() {
  const { id } = useParams()
  const capture = useCapture(id)
  const socket = useCaptureSocket(id)

  if (capture.isPending) {
    return (
      <SessionLayout>
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="aspect-video w-full" />
      </SessionLayout>
    )
  }

  if (capture.isError) {
    const notFound = isAxiosError(capture.error) && capture.error.response?.status === 404
    return (
      <SessionLayout>
        <Alert variant="destructive" className="max-w-2xl">
          <CircleAlertIcon />
          <AlertTitle>
            {notFound ? 'Sessão de captura não encontrada' : 'Não foi possível abrir a sessão'}
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {notFound
              ? 'Ela pode ter sido encerrada. Comece um novo registro.'
              : 'Verifique sua conexão e tente de novo.'}
            <Button asChild variant="outline" size="sm">
              <Link to="/capturas/nova">Novo Registro</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </SessionLayout>
    )
  }

  // O WebSocket traz o estado mais recente; antes da primeira mensagem, vale o da API.
  const status = socket.captureStatus ?? capture.data.status
  const live = status === 'READY' || status === 'RECORDING'
  // Caiu a conexão no meio da sessão: o hook tenta reconectar sozinho.
  const reconnecting = !isFinalCaptureStatus(status) && socket.status !== 'open'

  return (
    <SessionLayout>
      <p role="status" className="sr-only">
        {STATUS_ANNOUNCEMENT[status]}
      </p>

      <LockedFields capture={capture.data} />

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled>Iniciar Gravação</Button>
        <Button variant="secondary" disabled>
          Capturar Tela
        </Button>
        {status === 'LOADING' && (
          <span className="ml-1 text-sm text-muted-foreground">
            Os botões ficam disponíveis assim que o site abrir.
          </span>
        )}
      </div>

      {reconnecting && live && (
        <Alert>
          <WifiOffIcon />
          <AlertTitle>Conexão com o navegador perdida</AlertTitle>
          <AlertDescription>Tentando reconectar…</AlertDescription>
        </Alert>
      )}

      <RemoteBrowserView
        url={capture.data.url}
        frame={socket.lastFrame}
        send={socket.send}
        interactive={live && socket.status === 'open'}
        recording={status === 'RECORDING'}
        overlay={sessionOverlay(status, capture.data, !!socket.lastFrame)}
      />
    </SessionLayout>
  )
}

function SessionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader
        title="Iniciar Registro de Conteúdo"
        description="Preencha os dados abaixo para iniciar um novo registro"
      />
      <div className="flex max-w-6xl flex-col gap-6">{children}</div>
    </>
  )
}

/** Título e URL do registro, bloqueados durante a sessão (Figma). */
function LockedFields({ capture }: { capture: Capture }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sessao-titulo">Título do Registro</Label>
        <Input id="sessao-titulo" value={capture.title} readOnly className="bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sessao-url">URL do site</Label>
        <Input id="sessao-url" value={capture.url} readOnly className="bg-muted font-mono" />
      </div>
    </div>
  )
}

/**
 * O que cobre o navegador fora do estado "site aberto"; `null` sem cobertura.
 * Uma função, e não um componente: um elemento que renderiza `null` ainda
 * seria "truthy" e a moldura da cobertura apareceria por cima do site.
 */
function sessionOverlay(status: CaptureStatus, capture: Capture, hasFrame: boolean): ReactNode {
  if (status === 'LOADING' || ((status === 'READY' || status === 'RECORDING') && !hasFrame)) {
    return (
      <>
        <LoaderCircleIcon aria-hidden className="size-7 animate-spin text-primary" />
        <p className="text-base font-medium">Abrindo o site no navegador seguro…</p>
        <p className="text-sm text-muted-foreground">Isso costuma levar poucos segundos.</p>
      </>
    )
  }
  if (status === 'LOAD_FAILED') return <LoadFailed capture={capture} />
  if (isFinalCaptureStatus(status)) {
    // Diálogos de conclusão e falha: task C5.
    return (
      <>
        <p className="text-base font-medium">{STATUS_ANNOUNCEMENT[status]}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/registros">Ver a lista dos registros</Link>
        </Button>
      </>
    )
  }
  return null
}

/** Site fora do ar: nada foi cobrado; dá para tentar de novo ou trocar o endereço. */
function LoadFailed({ capture }: { capture: Capture }) {
  const navigate = useNavigate()
  const create = useCreateCapture()

  const retry = async () => {
    try {
      const next = await create.mutateAsync({ title: capture.title, url: capture.url })
      await navigate(`/capturas/${next.id}/sessao`, { replace: true })
    } catch (error) {
      toast.error('Não foi possível tentar de novo', { description: getErrorMessage(error) })
    }
  }

  return (
    <>
      <CircleAlertIcon aria-hidden className="size-8 text-destructive" />
      <p className="text-lg font-semibold">Não foi possível abrir o site</p>
      <p className="max-w-lg text-sm text-muted-foreground">
        O endereço não respondeu. Confira se ele está correto e se o site está no ar. Nenhum crédito
        foi consumido.
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Button onClick={() => void retry()} disabled={create.isPending}>
          {create.isPending ? 'Abrindo…' : 'Tentar novamente'}
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            void navigate('/capturas/nova', { state: { title: capture.title, url: capture.url } })
          }
        >
          Alterar endereço
        </Button>
      </div>
    </>
  )
}
