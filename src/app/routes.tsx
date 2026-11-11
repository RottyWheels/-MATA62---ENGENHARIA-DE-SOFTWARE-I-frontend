import { redirect, type RouteObject } from 'react-router'

import { RedirectIfAuthenticated, RequireAuth } from '@/features/auth'
import { FullPageLoader } from '@/shared/components/FullPageLoader'

import { RouteErrorPage } from './pages/RouteErrorPage'

/**
 * Rotas da aplicação. As páginas de cada feature são carregadas sob demanda (`lazy`).
 * Separado de `router.tsx` para que os testes montem as mesmas rotas num memory router.
 */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          {
            lazy: async () => ({
              Component: (await import('./layouts/PublicLayout')).PublicLayout,
            }),
            children: [
              {
                path: 'login',
                lazy: async () => ({
                  Component: (await import('@/features/auth/pages/LoginPage')).LoginPage,
                }),
              },
              {
                path: 'cadastro',
                lazy: async () => ({
                  Component: (await import('@/features/auth/pages/RegisterPage')).RegisterPage,
                }),
              },
              {
                path: 'recuperar-senha',
                lazy: async () => ({
                  Component: (await import('@/features/auth/pages/PasswordResetPage'))
                    .PasswordResetPage,
                }),
              },
            ],
          },
        ],
      },
      {
        // Fora do <RedirectIfAuthenticated>: o link do e-mail funciona mesmo com sessão aberta.
        lazy: async () => ({
          Component: (await import('./layouts/PublicLayout')).PublicLayout,
        }),
        children: [
          {
            path: 'redefinir-senha',
            lazy: async () => ({
              Component: (await import('@/features/auth/pages/NewPasswordPage')).NewPasswordPage,
            }),
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            lazy: async () => ({
              Component: (await import('./layouts/AppLayout')).AppLayout,
            }),
            children: [
              { index: true, loader: () => redirect('/registros') },
              {
                path: 'creditos',
                lazy: async () => ({
                  Component: (await import('@/features/credits/pages/PurchasePage')).PurchasePage,
                }),
              },
              {
                path: 'creditos/checkout/:pacoteId',
                lazy: async () => ({
                  Component: (await import('@/features/credits/pages/PurchasePage')).PurchasePage,
                }),
              },
              {
                path: 'creditos/pagamento/:pagamentoId',
                lazy: async () => ({
                  Component: (await import('@/features/credits/pages/PaymentStatusPage'))
                    .PaymentStatusPage,
                }),
              },
              {
                path: 'capturas/nova',
                lazy: async () => ({
                  Component: (await import('@/features/capture/pages/NewCapturePage'))
                    .NewCapturePage,
                }),
              },
              {
                path: 'capturas/:id/sessao',
                lazy: async () => ({
                  Component: (await import('@/features/capture/pages/CaptureSessionPage'))
                    .CaptureSessionPage,
                }),
              },
              {
                path: 'registros',
                lazy: async () => ({
                  Component: (await import('@/features/records/pages/RecordsPage')).RecordsPage,
                }),
              },
              {
                path: 'registros/:id',
                lazy: async () => ({
                  Component: (await import('@/features/records/pages/RecordDetailsPage'))
                    .RecordDetailsPage,
                }),
              },
            ],
          },
        ],
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('./pages/NotFoundPage')).NotFoundPage,
        }),
      },
    ],
  },
]
