import { isAxiosError } from 'axios'
import { Link, useParams } from 'react-router'

import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatCurrency, formatDateTime, formatNumber } from '@/shared/lib/format'

import { usePayment } from '../api/credits'
import type { PaymentMethod } from '../api/types'
import { PaymentSimulation } from '../components/PaymentSimulation'
import { PaymentStatusBadge } from '../components/PaymentStatusBadge'
import { PixDetails } from '../components/PixDetails'
import { isPaymentSimulationEnabled } from '../lib/simulation'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  MERCADO_PAGO: 'Mercado Pago',
}

/** Rótulo da forma de pagamento; um valor novo do backend aparece como veio. */
const methodLabel = (method: string) =>
  Object.hasOwn(METHOD_LABEL, method) ? METHOD_LABEL[method as PaymentMethod] : method

/**
 * Status do pagamento (REQ 06–07). Destino do retorno do Mercado Pago e
 * endereço que pode ser reaberto para acompanhar um Pix.
 */
export function PaymentStatusPage() {
  const { pagamentoId } = useParams()
  const { data: payment, isPending, isError, error } = usePayment(pagamentoId)

  return (
    <>
      <PageHeader
        title="Pagamento"
        description="Acompanhe a confirmação da sua compra de créditos."
      />

      <Card className="max-w-xl">
        <CardContent className="space-y-5">
          {isPending && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {isError && (
            <p role="alert" className="text-sm">
              {isAxiosError(error) && error.response?.status === 404
                ? 'Pagamento não encontrado.'
                : 'Não foi possível consultar o pagamento. Tente novamente.'}
            </p>
          )}

          {payment && (
            <>
              <PaymentStatusBadge status={payment.status} />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Pacote</dt>
                <dd>{payment.packageName}</dd>
                <dt className="text-muted-foreground">Créditos</dt>
                <dd>{formatNumber(payment.credits)}</dd>
                <dt className="text-muted-foreground">Valor</dt>
                <dd>{formatCurrency(payment.amount)}</dd>
                <dt className="text-muted-foreground">Forma de pagamento</dt>
                <dd>{methodLabel(payment.method)}</dd>
                <dt className="text-muted-foreground">Criado em</dt>
                <dd>{formatDateTime(payment.createdAt)}</dd>
                {payment.decidedAt && (
                  <>
                    <dt className="text-muted-foreground">
                      {payment.status === 'RECUSADO' ? 'Recusado em' : 'Aprovado em'}
                    </dt>
                    <dd>{formatDateTime(payment.decidedAt)}</dd>
                  </>
                )}
              </dl>

              {payment.status === 'PENDENTE' && payment.pix && (
                <PixDetails payment={payment} pix={payment.pix} />
              )}
              {payment.status === 'PENDENTE' &&
                import.meta.env.DEV &&
                isPaymentSimulationEnabled() && <PaymentSimulation paymentId={payment.id} />}
              {payment.status === 'APROVADO' && (
                <p className="text-sm">
                  Os créditos já foram adicionados ao seu saldo. Você também receberá a confirmação
                  por e-mail.
                </p>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {payment?.status === 'APROVADO' && (
              <Button asChild>
                <Link to="/capturas/nova">Novo registro</Link>
              </Button>
            )}
            {(payment?.status === 'RECUSADO' || payment?.status === 'EXPIRADO') && (
              <Button asChild>
                <Link to="/creditos">Tentar novamente</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/creditos">Voltar para créditos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
