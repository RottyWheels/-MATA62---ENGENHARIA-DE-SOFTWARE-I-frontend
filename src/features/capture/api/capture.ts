import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { getMeQueryKey } from '@/features/auth'
import { getRecordsQueryKey } from '@/features/records'
import { customInstance, type ErrorType } from '@/shared/api/http'
import type { ProblemDetail } from '@/shared/api/problem-detail'

import { CAPTURE_ENDPOINTS } from './endpoints'
import type {
  Capture,
  CapturePrice,
  CaptureScreenshot,
  CreateCaptureRequest,
  FinishCaptureResponse,
} from './types'

// Escrito à mão no formato do orval (funções + query keys + hooks).

export type CaptureError = ErrorType<ProblemDetail>

/** Código do 402 quando o saldo não cobre o registro. */
export const INSUFFICIENT_CREDITS = 'SALDO_INSUFICIENTE'

export const getCapturePrice = (signal?: AbortSignal) =>
  customInstance<CapturePrice>({ url: CAPTURE_ENDPOINTS.price, method: 'GET', signal })

export const postCapture = (body: CreateCaptureRequest) =>
  customInstance<Capture>({ url: CAPTURE_ENDPOINTS.create, method: 'POST', data: body })

export const getCapture = (id: string, signal?: AbortSignal) =>
  customInstance<Capture>({ url: CAPTURE_ENDPOINTS.detail(id), method: 'GET', signal })

export const postScreenshot = (id: string) =>
  customInstance<CaptureScreenshot>({ url: CAPTURE_ENDPOINTS.screenshots(id), method: 'POST' })

export const postRecordingStart = (id: string) =>
  customInstance<Capture>({ url: CAPTURE_ENDPOINTS.recordingStart(id), method: 'POST' })

export const postRecordingStop = (id: string) =>
  customInstance<Capture>({ url: CAPTURE_ENDPOINTS.recordingStop(id), method: 'POST' })

export const postFinish = (id: string) =>
  customInstance<FinishCaptureResponse>({ url: CAPTURE_ENDPOINTS.finish(id), method: 'POST' })

export const postCancel = (id: string) =>
  customInstance<void>({ url: CAPTURE_ENDPOINTS.cancel(id), method: 'POST' })

export const getCapturePriceQueryKey = () => ['captures', 'price'] as const
export const getCaptureQueryKey = (id: string) => ['captures', 'detail', id] as const

export function useCapturePrice() {
  return useQuery<CapturePrice, CaptureError>({
    queryKey: getCapturePriceQueryKey(),
    queryFn: ({ signal }) => getCapturePrice(signal),
    staleTime: 10 * 60_000,
  })
}

export function useCapture(id: string | undefined) {
  return useQuery<Capture, CaptureError>({
    queryKey: getCaptureQueryKey(id ?? ''),
    queryFn: ({ signal }) => getCapture(id ?? '', signal),
    enabled: !!id,
  })
}

export function useCreateCapture() {
  const queryClient = useQueryClient()
  return useMutation<Capture, CaptureError, CreateCaptureRequest>({
    mutationFn: postCapture,
    onSuccess: (capture) => queryClient.setQueryData(getCaptureQueryKey(capture.id), capture),
  })
}

/**
 * Concluir vira registro (saldo e lista mudam); cancelar não gasta crédito,
 * mas a sessão deixa de existir. Os dois atualizam o que depende disso.
 */
export function useFinishCapture() {
  const queryClient = useQueryClient()
  return useMutation<FinishCaptureResponse, CaptureError, string>({
    mutationFn: postFinish,
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getCaptureQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getMeQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getRecordsQueryKey().slice(0, 2) }),
      ])
    },
  })
}

export function useCancelCapture() {
  const queryClient = useQueryClient()
  return useMutation<void, CaptureError, string>({
    mutationFn: postCancel,
    onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: getCaptureQueryKey(id) }),
  })
}

/** Atualiza a sessão no cache sem nova consulta (respostas e mensagens do socket). */
export function useUpdateCaptureCache(id: string | undefined) {
  const queryClient = useQueryClient()
  return useCallback(
    (update: (capture: Capture) => Capture) => {
      if (!id) return
      queryClient.setQueryData<Capture>(getCaptureQueryKey(id), (current) =>
        current ? update(current) : current,
      )
    },
    [id, queryClient],
  )
}

/** "Capturar Tela": a captura entra na lista da sessão assim que o backend confirma. */
export function useCaptureScreenshot(id: string) {
  const update = useUpdateCaptureCache(id)
  return useMutation<CaptureScreenshot, CaptureError, void>({
    mutationFn: () => postScreenshot(id),
    onSuccess: (screenshot) =>
      update((capture) => ({ ...capture, screenshots: [...capture.screenshots, screenshot] })),
  })
}

/** "Iniciar Gravação" e "Concluir gravação". */
export function useCaptureRecording(id: string) {
  const queryClient = useQueryClient()
  return useMutation<Capture, CaptureError, 'start' | 'stop'>({
    mutationFn: (action) => (action === 'start' ? postRecordingStart(id) : postRecordingStop(id)),
    onSuccess: (capture) => queryClient.setQueryData(getCaptureQueryKey(id), capture),
  })
}
