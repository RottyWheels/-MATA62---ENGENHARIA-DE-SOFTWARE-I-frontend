import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'

import { queryClient } from '@/shared/api/query-client'
import { ThemeProvider } from '@/shared/components/theme/ThemeProvider'
import { Toaster } from '@/shared/components/ui/sonner'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* No celular, abaixo da faixa verde do topo (h-14): o aviso não cobre o menu. */}
        <Toaster richColors closeButton position="top-right" mobileOffset={{ top: 64 }} />
        {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
