import axios, { isAxiosError, type AxiosError, type AxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

import { queryClient } from './query-client'

/**
 * Instância Axios única da aplicação.
 *
 * Autenticação por cookie de sessão (Spring Session) na mesma origem:
 * nada de token em localStorage/sessionStorage. O Axios lê o cookie
 * `XSRF-TOKEN` e envia o cabeçalho `X-XSRF-TOKEN` nas requisições.
 */
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: { Accept: 'application/json, application/problem+json' },
})

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Desliga os toasts/redirecionamentos globais do interceptor. */
    skipGlobalErrorHandler?: boolean
  }
}

export const LOGIN_PATH = '/login'

type UnauthorizedHandler = (redirectTo: string) => void

let onUnauthorized: UnauthorizedHandler = (redirectTo) => {
  window.location.assign(redirectTo)
}

/** O router registra aqui sua navegação, para redirecionar sem recarregar a página. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler
}

/**
 * Endpoints em que o 401 é esperado e tratado por quem chamou:
 * `/me` (sem sessão → RequireAuth redireciona) e `/auth/*` (ex.: credenciais inválidas).
 */
function isAuthEndpoint(url: string | undefined) {
  if (!url) return false
  const path = url.replace(/^\/api/, '')
  return path === '/me' || path.startsWith('/auth/')
}

/** Monta `/login?redirect=<rota atual>` (sem redirect para `/` ou para o próprio login). */
export function buildLoginRedirect(location: Pick<Location, 'pathname' | 'search' | 'hash'>) {
  const current = `${location.pathname}${location.search}${location.hash}`
  if (location.pathname === LOGIN_PATH || current === '/') return LOGIN_PATH
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(current)}`
}

export function handleHttpError(error: unknown) {
  if (!isAxiosError(error) || error.config?.skipGlobalErrorHandler) return
  if (axios.isCancel(error)) return

  const status = error.response?.status

  if (status === 401) {
    if (isAuthEndpoint(error.config?.url)) return
    queryClient.clear()
    if (window.location.pathname !== LOGIN_PATH) {
      onUnauthorized(buildLoginRedirect(window.location))
    }
    return
  }

  if (status === 403) {
    toast.error('Acesso negado', {
      id: 'http-403',
      description: 'Você não tem permissão para realizar esta ação.',
    })
    return
  }

  if (status === undefined || status >= 500) {
    toast.error('Algo deu errado', {
      id: 'http-generic',
      description:
        status === undefined
          ? 'Não foi possível conectar ao servidor. Verifique sua conexão.'
          : 'Erro inesperado no servidor. Tente novamente em instantes.',
    })
  }
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    handleHttpError(error)
    return Promise.reject(error)
  },
)

/**
 * Mutator usado pelo orval (`orval.config.ts`): recebe a config da requisição
 * gerada e devolve apenas o corpo da resposta. Os caminhos do OpenAPI já vêm
 * com `/api`; como a instância usa `baseURL: '/api'`, o prefixo é removido aqui.
 */
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> =>
  http<T>({ ...config, ...options, url: config.url?.replace(/^\/api(?=\/|$)/, '') }).then(
    ({ data }) => data,
  )

/** Tipos auxiliares no formato esperado pelo orval. */
export type ErrorType<E> = AxiosError<E>
export type BodyType<B> = B
