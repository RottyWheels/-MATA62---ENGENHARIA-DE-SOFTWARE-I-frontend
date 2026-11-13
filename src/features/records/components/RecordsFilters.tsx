import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

import { PERIODS, type Period, type RecordsFilters as Filters } from '../lib/filters'
import { RECORD_STATUS_LABEL, RECORD_STATUSES } from '../lib/status'

/** Espera de digitação antes de buscar. */
export const SEARCH_DEBOUNCE_MS = 300

type Props = {
  filters: Filters
  onChange: (changes: Partial<Omit<Filters, 'pagina'>>) => void
}

export function RecordsFilters({ filters, onChange }: Props) {
  const [search, setSearch] = useState(filters.q)

  // A URL é a fonte da verdade: limpar os filtros ou voltar no histórico atualiza o campo.
  const [lastQ, setLastQ] = useState(filters.q)
  if (filters.q !== lastQ) {
    setLastQ(filters.q)
    setSearch(filters.q)
  }

  useEffect(() => {
    const value = search.trim()
    if (value === filters.q) return
    const timer = setTimeout(() => onChange({ q: value }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search, filters.q, onChange])

  return (
    <div role="search" className="mb-6 flex flex-wrap items-end gap-3">
      <div className="flex min-w-60 flex-[1_1_20rem] flex-col gap-1.5">
        <Label htmlFor="filtro-busca">Buscar</Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="filtro-busca"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Título ou endereço do site"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-48">
        <Label htmlFor="filtro-status">Status</Label>
        <Select
          value={filters.status}
          onValueChange={(value) => onChange({ status: value as Filters['status'] })}
        >
          <SelectTrigger id="filtro-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {RECORD_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {RECORD_STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-48">
        <Label htmlFor="filtro-periodo">Período</Label>
        <Select
          value={filters.periodo}
          onValueChange={(value) => onChange({ periodo: value as Period })}
        >
          <SelectTrigger id="filtro-periodo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
