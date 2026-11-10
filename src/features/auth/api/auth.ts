import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { customInstance, type ErrorType } from '@/shared/api/http'
import type { ProblemDetail } from '@/shared/api/problem-detail'

import { AUTH_ENDPOINTS } from './endpoints'
import type { LoginRequest, PasswordResetRequest, RegisterRequest, User } from './types'

// Escrito à mão no formato do orval (funções + query keys + hooks).

/** Busca o token CSRF: o backend grava o cookie `XSRF-TOKEN`. */
export const getCsrf = (signal?: AbortSignal) =>
  customInstance<void>({
    url: AUTH_ENDPOINTS.csrf,
    method: 'GET',
    signal,
    skipGlobalErrorHandler: true,
  })

/** Garante o cookie CSRF sem quebrar a aplicação se o backend estiver fora do ar. */
export async function refreshCsrf() {
  try {
    await getCsrf()
  } catch {
    // O próximo POST falhará com 403 e o erro aparecerá no formulário.
  }
}

export const getMe = (signal?: AbortSignal) =>
  customInstance<User>({ url: AUTH_ENDPOINTS.me, method: 'GET', signal })

export const postLogin = (body: LoginRequest) =>
  customInstance<User>({ url: AUTH_ENDPOINTS.login, method: 'POST', data: body })

export const postLogout = () => customInstance<void>({ url: AUTH_ENDPOINTS.logout, method: 'POST' })

export const postRegister = (body: RegisterRequest) =>
  customInstance<User>({ url: AUTH_ENDPOINTS.register, method: 'POST', data: body })

export const postPasswordReset = (body: PasswordResetRequest) =>
  customInstance<void>({ url: AUTH_ENDPOINTS.passwordReset, method: 'POST', data: body })

export const getMeQueryKey = () => ['me'] as const

export type AuthError = ErrorType<ProblemDetail>

/** Usuário logado. 401 = sem sessão (sem nova tentativa). */
export function useMe() {
  return useQuery<User, AuthError>({
    queryKey: getMeQueryKey(),
    queryFn: ({ signal }) => getMe(signal),
    retry: false,
    staleTime: 5 * 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation<User, AuthError, LoginRequest>({
    mutationFn: postLogin,
    onSuccess: async (user) => {
      // O Spring troca o token CSRF após autenticar.
      await refreshCsrf()
      queryClient.setQueryData(getMeQueryKey(), user)
      await queryClient.invalidateQueries({ queryKey: getMeQueryKey() })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation<void, AuthError, void>({
    mutationFn: postLogout,
    onSettled: async () => {
      queryClient.clear()
      await refreshCsrf()
    },
  })
}

export function useRegister() {
  return useMutation<User, AuthError, RegisterRequest>({ mutationFn: postRegister })
}

export function usePasswordReset() {
  return useMutation<void, AuthError, PasswordResetRequest>({ mutationFn: postPasswordReset })
}
