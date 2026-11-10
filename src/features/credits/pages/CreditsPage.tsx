import { PageHeader } from '@/shared/components/page/PageHeader'
import { PagePlaceholder } from '@/shared/components/page/PagePlaceholder'

export function CreditsPage() {
  return (
    <>
      <PageHeader title="Créditos" description="Escolha um pacote: básico, médio ou premium." />
      <PagePlaceholder requirement="REQ 05 — Comprar créditos (pacotes de créditos)." />
    </>
  )
}
