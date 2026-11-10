import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { formatDateTime } from '@/shared/lib/format'

import type { RecordSummary } from '../types'

const features = tableFeatures({})
const column = createColumnHelper<typeof features, RecordSummary>()

const columns = column.columns([
  column.accessor('title', { header: 'Título' }),
  column.accessor('startedAt', {
    header: 'Início',
    cell: (info) => formatDateTime(info.getValue()),
  }),
  column.accessor('finishedAt', {
    header: 'Fim',
    cell: (info) => {
      const value = info.getValue()
      return value ? formatDateTime(value) : '—'
    },
  }),
  column.accessor('details', { header: 'Detalhes' }),
  column.accessor('status', { header: 'Status' }),
])

/** Lista de registros (REQ 12). */
export function RecordsTable({ data }: { data: RecordSummary[] }) {
  const table = useTable({ features, columns, data })

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum registro realizado ainda.
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
