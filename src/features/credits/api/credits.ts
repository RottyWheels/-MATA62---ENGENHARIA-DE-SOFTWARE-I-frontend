import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { customInstance, type ErrorType } from '@/shared/api/http'
import type { ProblemDetail } from '@/shared/api/problem-detail'

import { CREDITS_ENDPOINTS } from './endpoints'
import type {
  Balance,
  CreditPackage,
  Payment,
  PaymentPage,
  PaymentSimulationRequest,
  PaymentStatus,
  PurchaseRequest,
} from './types'

// Escrito à mão no formato do orval (funções + query keys + hooks).

export type CreditsError = ErrorType<ProblemDetail>

export const getPackages = (signal?: AbortSignal) =>
  customInstance<CreditPackage[]>({ url: CREDITS_ENDPOINTS.packages, method: 'GET', signal })

export const getBalance = (signal?: AbortSignal) =>
  customInstance<Balance>({ url: CREDITS_ENDPOINTS.balance, method: 'GET', signal })

/**
 * Cria a compra. O `Idempotency-Key` (obrigatório) evita pedido duplicado se a requisição for
 * repetida: a mesma chave devolve o mesmo pedido, com 200 em vez de 201. Os dois são sucesso.
 */
export const postPurchase = (body: PurchaseRequest, idempotencyKey: string) =>
  customInstance<Payment>({
    url: CREDITS_ENDPOINTS.purchases,
    method: 'POST',
    data: body,
    headers: { 'Idempotency-Key': idempotencyKey },
  })

export const getPayment = (id: string, signal?: AbortSignal) =>
  customInstance<Payment>({ url: CREDITS_ENDPOINTS.payment(id), method: 'GET', signal })

/** Pedidos do usuário (`size` até 50), do mais recente para o mais antigo. Histórico do perfil. */
export const getPayments = (params: { page?: number; size?: number }, signal?: AbortSignal) =>
  customInstance<PaymentPage>({ url: CREDITS_ENDPOINTS.payments, method: 'GET', params, signal })

/**
 * Aprova ou recusa o próprio pedido sem provedor. Só existe no backend de desenvolvimento
 * (`PAYMENT_SIMULATION_ENABLED=true`). O caminho fica aqui, e não em `CREDITS_ENDPOINTS`, para
 * sair do bundle de produção junto com a função.
 */
export const postPaymentSimulation = (id: string, body: PaymentSimulationRequest) =>
  customInstance<Payment>({
    url: `${CREDITS_ENDPOINTS.payment(id)}/simulation`,
    method: 'POST',
    data: body,
  })

export const getPackagesQueryKey = () => ['credits', 'packages'] as const
export const getBalanceQueryKey = () => ['credits', 'balance'] as const
export const getPaymentQueryKey = (id: string) => ['credits', 'payments', id] as const
export const getPaymentsQueryKey = (params: { page?: number; size?: number }) =>
  ['credits', 'payments', 'list', params] as const

export function usePackages() {
  return useQuery<CreditPackage[], CreditsError>({
    queryKey: getPackagesQueryKey(),
    queryFn: ({ signal }) => getPackages(signal),
    staleTime: 10 * 60_000,
  })
}

/** Saldo de créditos do usuário logado. */
export function useBalance() {
  return useQuery<Balance, CreditsError>({
    queryKey: getBalanceQueryKey(),
    queryFn: ({ signal }) => getBalance(signal),
  })
}

/** Histórico de compras do usuário logado (uma página). */
export function usePayments(params: { page?: number; size?: number }) {
  return useQuery<PaymentPage, CreditsError>({
    queryKey: getPaymentsQueryKey(params),
    queryFn: ({ signal }) => getPayments(params, signal),
  })
}

export function usePurchase() {
  return useMutation<Payment, CreditsError, { body: PurchaseRequest; idempotencyKey: string }>({
    mutationFn: ({ body, idempotencyKey }) => postPurchase(body, idempotencyKey),
  })
}

/** Intervalo de consulta do status enquanto o pagamento estiver pendente. */
export const PAYMENT_POLL_MS = 3_000

const FINAL_STATUSES: ReadonlySet<string> = new Set<PaymentStatus>([
  'APROVADO',
  'RECUSADO',
  'EXPIRADO',
])

/**
 * Só os status conhecidos como finais param a consulta. `PENDENTE` e um status desconhecido
 * (ex.: um valor novo do backend) continuam sendo consultados.
 */
export const isFinalStatus = (status: string | undefined) =>
  status !== undefined && FINAL_STATUSES.has(status)

/**
 * Acompanha um pagamento: consulta a cada {@link PAYMENT_POLL_MS} enquanto estiver
 * pendente e, ao aprovar, atualiza o saldo de créditos.
 */
export function usePayment(id: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery<Payment, CreditsError>({
    queryKey: getPaymentQueryKey(id ?? ''),
    queryFn: async ({ signal }) => {
      const payment = await getPayment(id ?? '', signal)
      if (payment.status === 'APROVADO') {
        await queryClient.invalidateQueries({ queryKey: getBalanceQueryKey() })
      }
      return payment
    },
    enabled: !!id,
    refetchInterval: (query) => (isFinalStatus(query.state.data?.status) ? false : PAYMENT_POLL_MS),
  })
}

/**
 * Simulação de desenvolvimento. Depois dela, a consulta do pedido é refeita: é o `usePayment`
 * que vê o `APROVADO` e atualiza o saldo, como faria com um pagamento real.
 */
export function useSimulatePayment(id: string) {
  const queryClient = useQueryClient()
  return useMutation<Payment, CreditsError, boolean>({
    mutationFn: (approved) => postPaymentSimulation(id, { approved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getPaymentQueryKey(id) }),
  })
}
