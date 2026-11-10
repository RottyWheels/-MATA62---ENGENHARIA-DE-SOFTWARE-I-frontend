import { PageHeader } from '@/shared/components/page/PageHeader'
import { PagePlaceholder } from '@/shared/components/page/PagePlaceholder'

export function NewCapturePage() {
  return (
    <>
      <PageHeader
        title="Iniciar Registro de Conteúdo"
        description="Informe o endereço do site e o título do registro."
      />
      <PagePlaceholder requirement="REQ 08: iniciar registro de conteúdo (captura de tela ou vídeo de navegação)." />
    </>
  )
}
