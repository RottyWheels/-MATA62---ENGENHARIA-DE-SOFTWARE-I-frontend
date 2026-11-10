import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { Link } from 'react-router'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { formatDateTime } from '@/shared/lib/format'

import type { RecordStatus, RecordSummary } from '../types'

const STATUS_LABEL: Record<RecordStatus, string> = {
  EM_ANDAMENTO: 'Processando',
  CONCLUIDO: 'Concluído',
  INTERROMPIDO: 'Interrompido',
  FALHOU: 'Falhou',
}

const features = tableFeatures({})
const column = createColumnHelper<typeof features, RecordSummary>()

// Colunas do Figma: Status, Data/hora início, Data/hora fim, Ações.
const columns = column.columns([
  column.accessor('status', { header: 'Status', cell: (info) => STATUS_LABEL[info.getValue()] }),
  column.accessor('startedAt', {
    header: 'Data/hora início',
    cell: (info) => formatDateTime(info.getValue()),
  }),
  column.accessor('finishedAt', {
    header: 'Data/hora fim',
    cell: (info) => {
      const value = info.getValue()
      return value ? formatDateTime(value) : '—'
    },
  }),
  column.display({
    id: 'acoes',
    header: 'Ações',
    cell: (info) => (
      <Link
        to={`/registros/${info.row.original.id}`}
        className="font-medium text-primary underline underline-offset-4"
      >
        Ver detalhes
        <span className="sr-only"> de {info.row.original.title}</span>
      </Link>
    ),
  }),
])

/** Lista de registros (REQ 12). */
export function RecordsTable({ data }: { data: RecordSummary[] }) {
  const table = useTable({ features, columns, data })

  return (
    <div className="rounded-lg border bg-card">
      <Table>
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
