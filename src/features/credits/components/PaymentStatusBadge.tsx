import { CircleCheckIcon, CircleXIcon, Clock3Icon, Loader2Icon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import type { PaymentStatus } from '../api/types'

const STATUS = {
  PENDING: { label: 'Aguardando pagamento', icon: Loader2Icon, className: 'text-muted-foreground' },
  APPROVED: { label: 'Pagamento aprovado', icon: CircleCheckIcon, className: 'text-primary' },
  REJECTED: { label: 'Pagamento recusado', icon: CircleXIcon, className: 'text-destructive' },
  EXPIRED: { label: 'Pagamento expirado', icon: Clock3Icon, className: 'text-destructive' },
} satisfies Record<PaymentStatus, { label: string; icon: typeof Loader2Icon; className: string }>

/** Status do pagamento, anunciado a leitores de tela quando muda. */
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, icon: Icon, className } = STATUS[status]
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-2 text-sm font-medium', className)}
    >
      <Icon className={cn('size-4', status === 'PENDING' && 'animate-spin')} aria-hidden />
      {label}
    </p>
  )
}
