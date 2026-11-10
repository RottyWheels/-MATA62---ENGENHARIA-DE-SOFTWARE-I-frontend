import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'

import { usePayment } from '../api/credits'
import type { Payment } from '../api/types'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { PixDetails } from './PixDetails'

type PixDialogProps = {
  payment: Payment | null
  onOpenChange: (open: boolean) => void
}

/** "PIX Gerado" (Figma): QR Code sobre a tela de compra; acompanha a confirmação. */
export function PixDialog({ payment, onOpenChange }: PixDialogProps) {
  const query = usePayment(payment?.id)
  const current = query.data ?? payment
  const status = current?.status
  const notified = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'APPROVED' && current && notified.current !== current.id) {
      notified.current = current.id
      toast.success('Pagamento confirmado', {
        description: `${current.credits} créditos foram adicionados ao seu saldo.`,
      })
    }
  }, [status, current])

  return (
    <Dialog open={!!payment} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PIX Gerado</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código para realizar o pagamento.
          </DialogDescription>
        </DialogHeader>

        {current?.pix && status === 'PENDING' && <PixDetails payment={current} pix={current.pix} />}

        {status === 'APPROVED' && (
          <p className="text-sm">
            Recebemos o pagamento. Os <strong>{current?.credits} créditos</strong> já estão no seu
            saldo.
          </p>
        )}
        {(status === 'REJECTED' || status === 'EXPIRED') && (
          <p className="text-sm">
            O pagamento não foi concluído. Gere um novo Pix para tentar de novo.
          </p>
        )}

        <DialogFooter className="items-center sm:justify-between">
          {status && <PaymentStatusBadge status={status} />}
          {status === 'APPROVED' ? (
            <Button asChild>
              <Link to="/capturas/nova">Novo registro</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
