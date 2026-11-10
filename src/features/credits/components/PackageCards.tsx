import { CheckIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatCurrency, formatNumber } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

import type { CreditPackage, CreditPackageId } from '../api/types'

type PackageCardsProps = {
  packages: CreditPackage[] | undefined
  isLoading: boolean
  value: CreditPackageId | undefined
  onChange: (id: CreditPackageId) => void
  invalid?: boolean
  describedBy?: string
}

/** "Escolha um pacote" (Figma): três cartões com preço, créditos e botão "Escolher". */
export function PackageCards({
  packages,
  isLoading,
  value,
  onChange,
  invalid,
  describedBy,
}: PackageCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label="Pacotes de créditos"
      aria-describedby={describedBy}
      className="grid gap-4 md:grid-cols-3"
    >
      {packages?.map((pkg) => {
        const selected = value === pkg.id
        return (
          <article
            key={pkg.id}
            className={cn(
              'flex flex-col rounded-lg border bg-card p-4 shadow-xs transition-colors',
              selected && 'border-primary ring-2 ring-primary/20',
              invalid && !value && 'border-destructive',
            )}
          >
            <h3 className="text-sm font-medium">{pkg.name}</h3>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {formatCurrency(pkg.price)}
            </p>
            <p className="mt-2 text-xs font-medium">
              {formatNumber(pkg.credits)} créditos · {formatCurrency(pkg.pricePerCredit)}/crédito
            </p>
            <p className="mt-3 flex-1 text-xs text-muted-foreground">{pkg.description}</p>
            <Button
              type="button"
              className="mt-4 w-full"
              variant={selected ? 'secondary' : 'default'}
              aria-pressed={selected}
              aria-label={`${selected ? 'Selecionado' : 'Escolher'}: ${pkg.name}`}
              onClick={() => onChange(pkg.id)}
            >
              {selected ? (
                <>
                  <CheckIcon />
                  Selecionado
                </>
              ) : (
                'Escolher'
              )}
            </Button>
          </article>
        )
      })}
    </div>
  )
}
