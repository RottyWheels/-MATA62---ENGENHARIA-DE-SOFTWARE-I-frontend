import { Navigate, Outlet, useSearchParams } from 'react-router'

import { FullPageLoader } from '@/shared/components/FullPageLoader'

import { useMe } from '../api/auth'
import { safeRedirect } from '../lib/redirect'

/** Rotas públicas (login, cadastro…): quem já está logado vai para `/` (ou `?redirect=`). */
export function RedirectIfAuthenticated() {
  const [searchParams] = useSearchParams()
  const me = useMe()

  if (me.isPending) return <FullPageLoader />
  if (me.isSuccess) return <Navigate to={safeRedirect(searchParams.get('redirect'))} replace />

  return <Outlet />
}
