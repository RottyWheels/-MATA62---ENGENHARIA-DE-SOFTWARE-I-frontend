import { PlusIcon } from 'lucide-react'
import { Link } from 'react-router'

import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/ui/button'

import { RecordsTable } from '../components/RecordsTable'

export function RecordsPage() {
  return (
    <>
      <PageHeader
        title="Registros"
        description="Capturas de tela e gravações de navegação realizadas."
        actions={
          <Button asChild>
            <Link to="/capturas/nova">
              <PlusIcon />
              Nova captura
            </Link>
          </Button>
        }
      />
      {/* Sem endpoint de listagem ainda (REQ 12): tabela vazia. */}
      <RecordsTable data={[]} />
    </>
  )
}
