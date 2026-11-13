import { InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatNumber } from '@/shared/lib/format'

const credits = (n: number) => `${formatNumber(n)} ${n === 1 ? 'crédito' : 'créditos'}`

type Props = {
  /** Créditos por registro; `undefined` enquanto carrega ou se o preço não veio. */
  cost: number | undefined
  costLoading: boolean
  /** Saldo do usuário; `undefined` quando o backend ainda não informa. */
  balance: number | undefined
  /** O saldo não cobre o registro (pelo saldo conhecido ou por um 402 do backend). */
  insufficient: boolean
}

/** Custo do registro e saldo, antes de iniciar (canvas: "Novo Registro · início com custo"). */
export function CaptureCostNotice({ cost, costLoading, balance, insufficient }: Props) {
  if (insufficient) {
    return (
      <Alert className="border-amber-300 bg-amber-50 text-amber-900">
        <TriangleAlertIcon />
        <AlertTitle>Você não tem créditos suficientes</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {cost !== undefined && `Cada registro consome ${credits(cost)}`}
            {cost !== undefined && balance !== undefined && ` e seu saldo é de ${credits(balance)}`}
            {cost !== undefined ? '. ' : ''}
            Compre um pacote para continuar; os dados preenchidos ficam nesta tela.
          </span>
          <Button asChild size="sm">
            <Link to="/creditos">Comprar créditos</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <section
      aria-label="Custo do registro"
      className="flex items-start gap-3 rounded-lg bg-accent p-4 text-accent-foreground"
    >
      <InfoIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
      {costLoading ? (
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold">
            {cost !== undefined
              ? `Este registro consome ${credits(cost)}`
              : 'Cada registro consome créditos do seu saldo'}
          </p>
          <p>
            {balance !== undefined && `Seu saldo atual é de ${credits(balance)}. `}O crédito só é
            descontado quando o registro é concluído; se falhar ou for cancelado, nada é cobrado.
          </p>
        </div>
      )}
    </section>
  )
}
