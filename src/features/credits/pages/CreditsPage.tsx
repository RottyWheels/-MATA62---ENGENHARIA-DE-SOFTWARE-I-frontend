import { useMe } from '@/features/auth'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { PagePlaceholder } from '@/shared/components/page/PagePlaceholder'
import { formatNumber } from '@/shared/lib/format'

export function CreditsPage() {
  const { data: me } = useMe()
  return (
    <>
      <PageHeader
        title="Compra de Créditos"
        description={`Saldo de créditos atual: ${formatNumber(me?.creditBalance ?? 0)}`}
      />
      <PagePlaceholder requirement="REQ 05–06: pacotes (básico, médio e premium), dados de faturamento e pagamento com Pix ou Mercado Pago." />
    </>
  )
}
