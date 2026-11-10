import { ShieldCheckIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <ShieldCheckIcon className="size-5 text-primary" aria-hidden />
      Veridt
    </span>
  )
}
