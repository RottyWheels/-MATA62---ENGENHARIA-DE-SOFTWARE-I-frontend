import { PageHeader } from '@/shared/components/page/PageHeader'
import { PagePlaceholder } from '@/shared/components/page/PagePlaceholder'

export function NewCapturePage() {
  return (
    <>
      <PageHeader
        title="Nova captura"
        description="Informe o endereço do site e o título do registro (captura de tela ou vídeo)."
      />
      <PagePlaceholder requirement="REQ 08 — Iniciar registro de conteúdo." />
    </>
  )
}
