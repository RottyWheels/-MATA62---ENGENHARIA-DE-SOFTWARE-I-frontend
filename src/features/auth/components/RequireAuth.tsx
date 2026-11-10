import { isAxiosError } from 'axios'
import { Navigate, Outlet, useLocation } from 'react-router'

import { buildLoginRedirect } from '@/shared/api/http'
import { FullPageLoader } from '@/shared/components/FullPageLoader'
import { Button } from '@/shared/components/ui/button'

import { useMe } from '../api/auth'

/** Protege as rotas autenticadas com `GET /api/me`; 401 → `/login?redirect=<rota>`. */
export function RequireAuth() {
  const location = useLocation()
  const me = useMe()

  if (me.isPending) return <FullPageLoader label="Verificando sessão…" />

  if (me.isError) {
    if (isAxiosError(me.error) && me.error.response?.status === 401) {
      return <Navigate to={buildLoginRedirect(location)} replace />
    }
    return (
      <div
        role="alert"
        className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p className="font-medium">Não foi possível verificar sua sessão.</p>
        <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
        <Button variant="outline" onClick={() => void me.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return <Outlet />
}
