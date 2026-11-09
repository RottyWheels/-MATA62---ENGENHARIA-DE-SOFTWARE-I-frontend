import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

function shouldRetry(failureCount: number, error: unknown) {
  // Erros 4xx não melhoram com nova tentativa.
  if (isAxiosError(error) && error.response && error.response.status < 500) return false
  return failureCount < 2
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/** Instância única usada pela aplicação (e pelo interceptor de 401). */
export const queryClient = createQueryClient()
