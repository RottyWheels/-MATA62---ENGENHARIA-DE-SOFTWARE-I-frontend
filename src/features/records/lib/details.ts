import { formatDate } from '@/shared/lib/format'

import type { RecordFile } from '../api/types'

/** `12/11/2026 09:12:04`: com segundos, porque o horário faz parte da prova. */
export const formatRecordTime = (value: string) => formatDate(value, 'dd/MM/yyyy HH:mm:ss')

/** `2026-11-12 12:12:04 UTC`, como no relatório. */
export function formatUtc(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`
}

/** "Imagens e vídeo", "2 imagens, 1 vídeo"… a partir dos arquivos do registro. */
export function describeFiles(files: RecordFile[]) {
  const images = files.filter((f) => f.kind === 'IMAGEM').length
  const videos = files.filter((f) => f.kind === 'VIDEO').length
  const kind =
    images && videos ? 'Imagens e vídeo' : videos ? 'Vídeo' : images ? 'Imagens' : 'Nenhum arquivo'
  const parts = [
    images ? `${images} ${images === 1 ? 'imagem' : 'imagens'}` : null,
    videos ? `${videos} ${videos === 1 ? 'vídeo' : 'vídeos'}` : null,
  ].filter(Boolean)
  return { kind, count: files.length, breakdown: parts.join(', ') }
}
