import { CameraIcon, CircleIcon, SquareIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

import type { Capture } from '../api/types'
import { RecordingBadge } from './RecordingBadge'

type Props = {
  capture: Capture
  /** Ação em andamento, para desativar os botões e mostrar o progresso. */
  busy: 'start' | 'stop' | 'screenshot' | 'finish' | null
  onStartRecording: () => void
  onStopRecording: () => void
  onScreenshot: () => void
  onFinish: () => void
  onCancel: () => void
}

/**
 * Ações da sessão (Figma "Criar Novo Registro"): "Iniciar Gravação" vira
 * "Concluir gravação"; "Capturar Tela" funciona gravando ou não. "Concluir
 * registro" pede ao menos uma captura ou gravação.
 */
export function CaptureToolbar({
  capture,
  busy,
  onStartRecording,
  onStopRecording,
  onScreenshot,
  onFinish,
  onCancel,
}: Props) {
  const recording = capture.status === 'RECORDING'
  const live = recording || capture.status === 'READY'
  const hasContent = capture.screenshots.length > 0 || capture.recordings > 0 || recording
  const disabled = !live || busy !== null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {recording ? (
          <Button onClick={onStopRecording} disabled={disabled}>
            <SquareIcon aria-hidden />
            {busy === 'stop' ? 'Concluindo…' : 'Concluir gravação'}
          </Button>
        ) : (
          <Button onClick={onStartRecording} disabled={disabled}>
            <CircleIcon aria-hidden />
            {busy === 'start' ? 'Iniciando…' : 'Iniciar Gravação'}
          </Button>
        )}
        <Button variant="secondary" onClick={onScreenshot} disabled={disabled}>
          <CameraIcon aria-hidden />
          {busy === 'screenshot' ? 'Capturando…' : 'Capturar Tela'}
        </Button>
        {live && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onCancel}
            disabled={busy !== null}
          >
            Cancelar registro
          </Button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {recording && capture.recordingStartedAt && (
            <RecordingBadge startedAt={capture.recordingStartedAt} />
          )}
          {live && (
            <Button
              variant="outline"
              className="border-primary text-accent-foreground"
              onClick={onFinish}
              disabled={!hasContent || busy !== null}
              aria-describedby={hasContent ? undefined : 'concluir-dica'}
            >
              {busy === 'finish' ? 'Concluindo…' : 'Concluir registro'}
            </Button>
          )}
        </div>
      </div>

      {capture.status === 'LOADING' && (
        <p className="text-sm text-muted-foreground">
          Os botões ficam disponíveis assim que o site abrir.
        </p>
      )}
      {recording && (
        <p className="text-sm text-muted-foreground">
          Tudo o que você fizer no navegador abaixo está sendo gravado. Role a página e abra os
          links que comprovam o conteúdo antes de concluir.
        </p>
      )}
      {live && !hasContent && (
        <p id="concluir-dica" className="text-sm text-muted-foreground">
          Capture ao menos uma tela ou grave um vídeo para concluir o registro.
        </p>
      )}
    </div>
  )
}
