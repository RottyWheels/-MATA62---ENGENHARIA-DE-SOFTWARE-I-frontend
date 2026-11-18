import { CircleCheckIcon, CircleHelpIcon, CircleXIcon, Clock3Icon, Loader2Icon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import type { PaymentStatus } from '../api/types'

type StatusInfo = { label: string; icon: typeof Loader2Icon; className: string }

const STATUS = {
  PENDENTE: {
    label: 'Aguardando pagamento',
    icon: Loader2Icon,
    className: 'text-muted-foreground',
  },
  APROVADO: { label: 'Pagamento aprovado', icon: CircleCheckIcon, className: 'text-primary' },
  RECUSADO: { label: 'Pagamento recusado', icon: CircleXIcon, className: 'text-destructive' },
  EXPIRADO: { label: 'Pagamento expirado', icon: Clock3Icon, className: 'text-destructive' },
} satisfies Record<PaymentStatus, StatusInfo>

/** Um status que o front ainda não conhece (ex.: valor novo do backend) não pode quebrar a página. */
const UNKNOWN: StatusInfo = {
  label: 'Pagamento em verificação',
  icon: CircleHelpIcon,
  className: 'text-muted-foreground',
}

function statusInfo(status: string): StatusInfo {
  return Object.hasOwn(STATUS, status) ? STATUS[status as PaymentStatus] : UNKNOWN
}

/** Status do pagamento, anunciado a leitores de tela quando muda. */
export function PaymentStatusBadge({ status }: { status: PaymentStatus | (string & {}) }) {
  const { label, icon: Icon, className } = statusInfo(status)
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-2 text-sm font-medium', className)}
    >
      <Icon className={cn('size-4', status === 'PENDENTE' && 'animate-spin')} aria-hidden />
      {label}
    </p>
  )
}
