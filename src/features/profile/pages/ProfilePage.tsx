import { CircleAlertIcon, CoinsIcon, PencilIcon, ReceiptTextIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useMe, type OabRegistration, type User } from '@/features/auth'
import { useBalance, usePayments, type PaymentStatus } from '@/features/credits'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { formatCurrency, formatDate, formatNumber } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

/** Primeira página do histórico (contrato: `GET /api/credits/payments?page=0&size=10`). */
const PAYMENTS_PARAMS = { page: 0, size: 10 }
const HISTORY_COLUMNS = 5

const STATUS_LABEL: Record<PaymentStatus, string> = {
  APROVADO: 'Aprovado',
  PENDENTE: 'Pendente',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
}

/** Mesmas cores dos selos da lista de registros; a palavra sempre acompanha a cor. */
const STATUS_CLASS: Record<PaymentStatus, string> = {
  APROVADO: 'bg-accent text-accent-foreground',
  PENDENTE: 'bg-amber-100 text-amber-800',
  RECUSADO: 'bg-red-100 text-red-800',
  EXPIRADO: 'bg-muted text-muted-foreground',
}

/** Um status novo do backend aparece como está, em cinza, sem quebrar a tela. */
function PurchaseStatusBadge({ status }: { status: string }) {
  const known = Object.hasOwn(STATUS_LABEL, status)
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        known ? STATUS_CLASS[status as PaymentStatus] : 'bg-muted text-muted-foreground',
      )}
    >
      {known ? STATUS_LABEL[status as PaymentStatus] : status}
    </span>
  )
}

/** `{ number: '12345', state: 'BA' }` → `12345/BA` (formato do Figma no cadastro). */
function formatOab(registrations: OabRegistration[]) {
  if (registrations.length === 0) return 'Não informada'
  return registrations.map((oab) => `${oab.number}/${oab.state}`).join(', ')
}

function initial(name: string | undefined) {
  return (name?.trim()[0] ?? '?').toUpperCase()
}

/** Alerta de erro padrão das telas, com "Tentar novamente". */
function LoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        Verifique sua conexão e tente de novo.
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}

function PersonalData({ me }: { me: User | undefined }) {
  // Enquanto carrega, cada valor vira uma linha de esqueleto.
  const value = (text: string | undefined) => text ?? <Skeleton className="mt-1 h-4 w-32" />

  return (
    <Card className="lg:col-span-2" aria-busy={!me || undefined}>
      <CardHeader>
        <CardTitle>Dados Pessoais</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {me ? (
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-semibold text-accent-foreground"
          >
            {initial(me.fullName)}
          </span>
        ) : (
          <Skeleton className="size-14 shrink-0 rounded-full" />
        )}
        <dl className="grid flex-1 gap-4 sm:grid-cols-2">
          <InfoItem label="Nome completo" value={value(me?.fullName)} />
          <InfoItem label="E-mail" value={value(me?.email)} />
          <InfoItem label="CPF" value={value(me && (me.cpfMasked || '—'))} />
          {(!me || me.type === 'ADVOGADO') && (
            <InfoItem label="OAB" value={value(me && formatOab(me.oabRegistrations))} />
          )}
        </dl>
      </CardContent>
    </Card>
  )
}

function BalanceCard() {
  const balance = useBalance()

  return (
    <Card className="bg-sidebar text-sidebar-foreground ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CoinsIcon className="size-4" aria-hidden />
          Saldo Atual
        </CardTitle>
        <CardDescription className="text-sidebar-foreground/80">
          Créditos disponíveis para novos registros
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        {balance.isPending ? (
          <Skeleton className="h-10 w-32 bg-white/20" />
        ) : balance.isError ? (
          <div className="flex flex-col items-start gap-2 text-sm">
            <p className="flex items-center gap-2">
              <CircleAlertIcon className="size-4" aria-hidden />
              Não foi possível carregar o saldo.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
              onClick={() => void balance.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <p className="text-4xl font-bold tracking-tight" data-testid="perfil-saldo">
            {formatNumber(balance.data.balance)}
            <span className="ml-2 text-base font-medium text-sidebar-foreground/80">
              {balance.data.balance === 1 ? 'crédito' : 'créditos'}
            </span>
          </p>
        )}
        <Button asChild variant="secondary" className="w-full">
          <Link to="/creditos">Comprar mais créditos</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function PurchaseHistory() {
  const payments = usePayments(PAYMENTS_PARAMS)
  const items = payments.data?.items ?? []

  return (
    <section aria-labelledby="historico-compras" className="flex flex-col gap-3">
      <h2 id="historico-compras" className="text-lg font-semibold">
        Histórico de Compras de Créditos
      </h2>

      {payments.isError ? (
        <LoadError
          title="Não foi possível carregar o histórico de compras"
          onRetry={() => void payments.refetch()}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table aria-busy={payments.isPending || undefined}>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Data da compra</TableHead>
                <TableHead className="font-semibold">Pacote</TableHead>
                <TableHead className="font-semibold">Créditos</TableHead>
                <TableHead className="font-semibold">Valor pago</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.isPending ? (
                Array.from({ length: 3 }, (_, row) => (
                  <TableRow key={row}>
                    {Array.from({ length: HISTORY_COLUMNS }, (_, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={HISTORY_COLUMNS}
                    className="py-14 text-center whitespace-normal"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <span
                        aria-hidden
                        className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground"
                      >
                        <ReceiptTextIcon className="size-6" />
                      </span>
                      <p className="text-base font-semibold text-foreground">
                        Você ainda não comprou créditos
                      </p>
                      <p className="text-sm text-muted-foreground">
                        As compras de pacotes aparecem aqui, com a data, o valor e o status do
                        pagamento.
                      </p>
                      <Button asChild className="mt-1">
                        <Link to="/creditos">Comprar créditos</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{payment.packageName}</TableCell>
                    <TableCell>{formatNumber(payment.credits)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <PurchaseStatusBadge status={payment.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {payments.data && payments.data.totalElements > items.length && (
        <p className="text-xs text-muted-foreground">
          Mostrando as {items.length} compras mais recentes de{' '}
          {formatNumber(payments.data.totalElements)}.
        </p>
      )}
    </section>
  )
}

/** Perfil do usuário: dados de `GET /api/me`, saldo e histórico de compras de créditos. */
export function ProfilePage() {
  const me = useMe()

  return (
    <>
      <PageHeader
        title="Meu Perfil"
        description="Seus dados pessoais, saldo e histórico de compras de créditos."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              toast.info('Em desenvolvimento', {
                description: 'A edição do perfil ainda não está disponível.',
              })
            }
          >
            <PencilIcon aria-hidden />
            Editar Perfil
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {me.isError ? (
            <div className="lg:col-span-2">
              <LoadError
                title="Não foi possível carregar seus dados"
                onRetry={() => void me.refetch()}
              />
            </div>
          ) : (
            <PersonalData me={me.data} />
          )}
          <BalanceCard />
        </div>

        <PurchaseHistory />
      </div>
    </>
  )
}
