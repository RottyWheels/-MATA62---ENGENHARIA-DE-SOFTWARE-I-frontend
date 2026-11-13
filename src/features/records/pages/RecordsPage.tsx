import { CircleAlertIcon, FileTextIcon, PlusIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { PageHeader } from '@/shared/components/page/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

import { useRecords } from '../api/records'
import { RecordDetailsSheet } from '../components/RecordDetailsSheet'
import { RecordsFilters } from '../components/RecordsFilters'
import { RecordsPagination } from '../components/RecordsPagination'
import { RecordsTable } from '../components/RecordsTable'
import {
  hasActiveFilters,
  readFilters,
  RECORDS_PAGE_SIZE,
  toRecordsQuery,
  writeFilters,
  type RecordsFilters as Filters,
} from '../lib/filters'

/**
 * Lista dos registros (REQ 12). `/registros/:id` mostra a mesma lista com o
 * painel de detalhes aberto (Figma "Lista dos Registros - Detalhes").
 */
export function RecordsPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const query = useMemo(() => toRecordsQuery(filters), [filters])
  const records = useRecords(query)

  const updateFilters = useCallback(
    (changes: Partial<Filters>, options?: { replace?: boolean }) => {
      // Mudar um filtro volta para a primeira página.
      const next = { ...filters, pagina: 1, ...changes }
      setSearchParams(writeFilters(next), options)
    },
    [filters, setSearchParams],
  )

  const onFiltersChange = useCallback(
    (changes: Partial<Omit<Filters, 'pagina'>>) =>
      // A busca muda a cada pausa na digitação: não enche o histórico.
      updateFilters(changes, { replace: 'q' in changes }),
    [updateFilters],
  )

  const search = writeFilters(filters).toString()
  const page = records.data
  const filtered = hasActiveFilters(filters)

  const empty = filtered ? (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
      <p className="text-base font-semibold text-foreground">
        Nenhum registro encontrado com esses filtros
      </p>
      <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>
        Limpar filtros
      </Button>
    </div>
  ) : (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground"
      >
        <FileTextIcon className="size-6" />
      </span>
      <p className="text-base font-semibold text-foreground">Você ainda não fez nenhum registro</p>
      <p className="text-sm text-muted-foreground">
        Os registros de capturas de tela e vídeos de navegação aparecem aqui, com o status, os
        horários e o relatório de cada um.
      </p>
      <Button asChild className="mt-1">
        <Link to="/capturas/nova">Fazer o primeiro registro</Link>
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Listagem dos Registros"
        description="Visualize todos os seus registros realizados na plataforma."
        actions={
          <Button asChild>
            <Link to="/capturas/nova">
              <PlusIcon aria-hidden />
              Novo Registro
            </Link>
          </Button>
        }
      />

      <RecordsFilters filters={filters} onChange={onFiltersChange} />

      {records.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Não foi possível carregar os registros</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            Verifique sua conexão e tente de novo.
            <Button variant="outline" size="sm" onClick={() => void records.refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div
            aria-busy={records.isPlaceholderData || undefined}
            className={records.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}
          >
            <RecordsTable
              data={page?.content ?? []}
              loading={records.isPending}
              empty={empty}
              search={search}
            />
          </div>
          {page && (
            <RecordsPagination
              // A página dos dados recebidos, não a da URL: enquanto a próxima
              // carrega, o rodapé continua descrevendo as linhas na tela.
              page={page.page + 1}
              totalPages={page.totalPages}
              pageSize={RECORDS_PAGE_SIZE}
              totalElements={page.totalElements}
              onPageChange={(pagina) => {
                updateFilters({ ...filters, pagina })
                window.scrollTo({ top: 0 })
              }}
            />
          )}
        </>
      )}

      <RecordDetailsSheet id={id} closeTo={{ pathname: '/registros', search }} />
    </>
  )
}
