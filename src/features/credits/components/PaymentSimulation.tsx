import { isAxiosError } from 'axios'
import { FlaskConicalIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

import { useSimulatePayment } from '../api/credits'

function errorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 404) {
    return 'Simulação indisponível: o backend precisa de PAYMENT_SIMULATION_ENABLED=true (já vem ligada no Docker Compose).'
  }
  return 'Não foi possível simular o pagamento. Tente novamente.'
}

/**
 * "Simular pagamento" (só em desenvolvimento): enquanto não há provedor, o pedido fica pendente
 * até ser aprovado ou recusado por `POST /api/credits/payments/{id}/simulation`. Quem decide
 * mostrar é `isPaymentSimulationEnabled()`.
 */
export function PaymentSimulation({ paymentId }: { paymentId: string }) {
  const simulate = useSimulatePayment(paymentId)
  const busy = simulate.isPending

  return (
    <section
      aria-labelledby={`simular-${paymentId}`}
      className="w-full space-y-2 rounded-lg border border-dashed p-3 text-left"
    >
      <h3 id={`simular-${paymentId}`} className="flex items-center gap-2 text-sm font-medium">
        <FlaskConicalIcon className="size-4" aria-hidden />
        Simular pagamento
      </h3>
      <p className="text-xs text-muted-foreground">
        Só em desenvolvimento: ainda não há provedor de pagamento, então o Pix não pode ser pago no
        banco. Aprove ou recuse este pedido pelo backend.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => simulate.mutate(true)}>
          Simular aprovação
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => simulate.mutate(false)}>
          Simular recusa
        </Button>
      </div>
      {simulate.isError && (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage(simulate.error)}
        </p>
      )}
    </section>
  )
}
