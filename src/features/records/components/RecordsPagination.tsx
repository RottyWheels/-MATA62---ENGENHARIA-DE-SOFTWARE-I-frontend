import { Button } from '@/shared/components/ui/button'
import { formatNumber } from '@/shared/lib/format'

import { pageNumbers } from '../lib/pagination'

type Props = {
  /** Página atual, começando em 1. */
  page: number
  totalPages: number
  pageSize: number
  totalElements: number
  onPageChange: (page: number) => void
}

export function RecordsPagination({
  page,
  totalPages,
  pageSize,
  totalElements,
  onPageChange,
}: Props) {
  if (totalElements === 0) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalElements)

  return (
    <nav
      aria-label="Paginação"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <p aria-live="polite">
        Mostrando {formatNumber(first)}–{formatNumber(last)} de {formatNumber(totalElements)}{' '}
        {totalElements === 1 ? 'registro' : 'registros'}
      </p>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          {pageNumbers(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} aria-hidden className="px-1">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? 'default' : 'outline'}
                size="sm"
                className="min-w-8"
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </nav>
  )
}
