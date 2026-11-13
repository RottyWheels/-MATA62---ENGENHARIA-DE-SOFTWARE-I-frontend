import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { formatDateTime } from '@/shared/lib/format'

import type { RecordSummary } from '../api/types'
import { RecordStatusBadge } from './RecordStatusBadge'

const features = tableFeatures({})
const column = createColumnHelper<typeof features, RecordSummary>()

function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

type Props = {
  data: RecordSummary[]
  /** Mostra linhas de esqueleto no lugar dos dados. */
  loading?: boolean
  /** Conteúdo da tabela sem linhas (vazio ou sem resultado no filtro). */
  empty?: ReactNode
  /** Query string a manter no link de detalhes, para fechar o painel sem perder os filtros. */
  search?: string
}

/** Lista de registros (REQ 12). Colunas do Figma, mais o título. */
export function RecordsTable({ data, loading = false, empty, search = '' }: Props) {
  const columns = column.columns([
    column.accessor('title', {
      header: 'Título',
      cell: (info) => (
        <div className="flex min-w-48 flex-col gap-0.5">
          <span className="font-medium">{info.getValue()}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {hostOf(info.row.original.url)}
          </span>
        </div>
      ),
    }),
    column.accessor('status', {
      header: 'Status',
      cell: (info) => <RecordStatusBadge status={info.getValue()} />,
    }),
    column.accessor('startedAt', {
      header: 'Data/hora início',
      cell: (info) => <span className="whitespace-nowrap">{formatDateTime(info.getValue())}</span>,
    }),
    column.accessor('finishedAt', {
      header: 'Data/hora fim',
      cell: (info) => {
        const value = info.getValue()
        return <span className="whitespace-nowrap">{value ? formatDateTime(value) : '—'}</span>
      },
    }),
    column.display({
      id: 'acoes',
      header: 'Ações',
      cell: (info) => (
        <Link
          to={{ pathname: `/registros/${info.row.original.id}`, search }}
          state={{ fromList: true }}
          className="font-medium whitespace-nowrap text-primary underline underline-offset-4"
        >
          Ver detalhes
          <span className="sr-only"> de {info.row.original.title}</span>
        </Link>
      ),
    }),
  ])
  const table = useTable({ features, columns, data })

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table aria-busy={loading || undefined}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="font-semibold">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }, (_, index) => (
              <TableRow key={index}>
                {columns.map((_, cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-14 text-center whitespace-normal">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
