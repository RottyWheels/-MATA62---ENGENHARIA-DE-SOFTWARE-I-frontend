import { useParams } from 'react-router'

import { PageHeader } from '@/shared/components/page/PageHeader'
import { PagePlaceholder } from '@/shared/components/page/PagePlaceholder'

export function CheckoutPage() {
  const { pacoteId } = useParams()
  return (
    <>
      <PageHeader title="Finalizar compra" description={`Pacote ${pacoteId ?? ''}`} />
      <PagePlaceholder requirement="REQ 05–06 — Dados de faturamento e pagamento (Mercado Pago ou Pix)." />
    </>
  )
}
