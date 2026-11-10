import { useParams } from 'react-router'

import { PageHeader } from '@/shared/components/page/PageHeader'
import { PagePlaceholder } from '@/shared/components/page/PagePlaceholder'

export function PaymentStatusPage() {
  const { pagamentoId } = useParams()
  return (
    <>
      <PageHeader title="Pagamento" description={`Pagamento ${pagamentoId ?? ''}`} />
      <PagePlaceholder requirement="REQ 06–07 — Status do pagamento e QR Code/código Pix." />
    </>
  )
}
