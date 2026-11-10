import { useParams } from 'react-router'

import { PageHeader } from '@/shared/components/page/PageHeader'
import { PagePlaceholder } from '@/shared/components/page/PagePlaceholder'

export function RecordDetailsPage() {
  const { id } = useParams()
  return (
    <>
      <PageHeader title="Detalhes do registro" description={`Registro ${id ?? ''}`} />
      <PagePlaceholder requirement="REQ 13–15 — Detalhes, relatório e download do arquivo ZIP." />
    </>
  )
}
