import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getMeQueryKey } from '@/features/auth'
import { customInstance, type ErrorType } from '@/shared/api/http'
import type { ProblemDetail } from '@/shared/api/problem-detail'

import { CREDITS_ENDPOINTS } from './endpoints'
import type { CreditPackage, Payment, PaymentStatus, PurchaseRequest } from './types'

// Escrito à mão no formato do orval (funções + query keys + hooks).

export type CreditsError = ErrorType<ProblemDetail>

export const getPackages = (signal?: AbortSignal) =>
  customInstance<CreditPackage[]>({ url: CREDITS_ENDPOINTS.packages, method: 'GET', signal })

/**
 * Cria a compra. O `Idempotency-Key` evita cobrança/créditos duplicados se a
 * requisição for repetida (tática de confiabilidade da arquitetura do Veridt).
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

export const getPackagesQueryKey = () => ['credits', 'packages'] as const
export const getPaymentQueryKey = (id: string) => ['credits', 'payments', id] as const

export function usePackages() {
  return useQuery<CreditPackage[], CreditsError>({
    queryKey: getPackagesQueryKey(),
    queryFn: ({ signal }) => getPackages(signal),
    staleTime: 10 * 60_000,
  })
}

export function usePurchase() {
  return useMutation<Payment, CreditsError, { body: PurchaseRequest; idempotencyKey: string }>({
    mutationFn: ({ body, idempotencyKey }) => postPurchase(body, idempotencyKey),
  })
}

/** Intervalo de consulta do status enquanto o pagamento estiver pendente. */
export const PAYMENT_POLL_MS = 3_000

export const isFinalStatus = (status: PaymentStatus | undefined) =>
  status !== undefined && status !== 'PENDING'

/**
 * Acompanha um pagamento: consulta a cada {@link PAYMENT_POLL_MS} enquanto estiver
 * pendente e, ao aprovar, atualiza o saldo do usuário (query `['me']`).
 */
export function usePayment(id: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery<Payment, CreditsError>({
    queryKey: getPaymentQueryKey(id ?? ''),
    queryFn: async ({ signal }) => {
      const payment = await getPayment(id ?? '', signal)
      if (payment.status === 'APPROVED') {
        await queryClient.invalidateQueries({ queryKey: getMeQueryKey() })
      }
      return payment
    },
    enabled: !!id,
    refetchInterval: (query) => (isFinalStatus(query.state.data?.status) ? false : PAYMENT_POLL_MS),
  })
}
