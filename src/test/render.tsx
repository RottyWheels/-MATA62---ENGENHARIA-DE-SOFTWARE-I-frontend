import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'

import { createQueryClient } from '@/shared/api/query-client'
import { ThemeProvider } from '@/shared/components/theme/ThemeProvider'

/** Renderiza rotas num memory router com QueryClient isolado. */
export function renderRoutes(routes: RouteObject[], initialPath = '/') {
  const queryClient = createQueryClient()
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  const user = userEvent.setup()

  const result = render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  )
  return { ...result, router, queryClient, user }
}
