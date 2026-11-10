import { Link } from 'react-router'

import { Logo } from '@/shared/components/Logo'
import { Button } from '@/shared/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <p className="text-5xl font-bold tracking-tight">404</p>
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O endereço acessado não existe ou foi removido.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </main>
  )
}
