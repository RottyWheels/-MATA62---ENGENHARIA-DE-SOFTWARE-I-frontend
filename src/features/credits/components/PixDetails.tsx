import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/shared/components/ui/button'
import { formatCurrency, formatDateTime } from '@/shared/lib/format'

import type { Payment, PixData } from '../api/types'

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Código Pix copiado')
  } catch {
    toast.error('Não foi possível copiar', {
      description: 'Selecione o código e copie manualmente.',
    })
  }
}

/** QR Code + "copia e cola" de um pagamento Pix (REQ 06). */
export function PixDetails({ payment, pix }: { payment: Payment; pix: PixData }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <img
        src={pix.qrCodeImage}
        alt={`QR Code Pix de ${formatCurrency(payment.amount)}`}
        className="size-52 rounded-md border bg-white p-2"
      />
      <p className="text-sm">
        Valor: <strong>{formatCurrency(payment.amount)}</strong> · {payment.credits} créditos
      </p>

      <div className="w-full space-y-2 text-left">
        <label htmlFor={`pix-${payment.id}`} className="text-sm font-medium">
          Pix copia e cola
        </label>
        <div className="flex gap-2">
          <input
            id={`pix-${payment.id}`}
            readOnly
            value={pix.copyPaste}
            onFocus={(event) => event.currentTarget.select()}
            className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-muted px-2.5 font-mono text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="button" variant="outline" onClick={() => void copy(pix.copyPaste)}>
            <CopyIcon />
            Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Válido até {formatDateTime(pix.expiresAt)}.</p>
      </div>
    </div>
  )
}
