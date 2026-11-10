import { PageHeader } from '@/shared/components/page/PageHeader'

import { RecordsTable } from '../components/RecordsTable'

export function RecordsPage() {
  return (
    <>
      <PageHeader
        title="Listagem dos Registros"
        description="Visualize todos os seus registros realizados na plataforma."
      />
      {/* Sem endpoint de listagem ainda (REQ 12): tabela vazia. */}
      <RecordsTable data={[]} />
    </>
  )
}
