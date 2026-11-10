import { useParams } from 'react-router'

import { PageHeader } from '@/shared/components/page/PageHeader'

import { RemoteBrowserView } from '../components/RemoteBrowserView'

export function CaptureSessionPage() {
  const { id = '' } = useParams()
  return (
    <>
      <PageHeader
        title="Sessão de captura"
        description="REQ 09–11 — Navegador remoto ao vivo (esqueleto; protocolo provisório)."
      />
      <RemoteBrowserView sessionId={id} />
    </>
  )
}
