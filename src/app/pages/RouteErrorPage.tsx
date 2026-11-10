import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { Button } from '@/shared/components/ui/button'

/** Erro inesperado ao carregar ou renderizar uma rota. */
export function RouteErrorPage() {
  const error = useRouteError()
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null

  return (
    <main
      role="alert"
      className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Não foi possível exibir esta página. Recarregue ou volte ao início.
      </p>
      {import.meta.env.DEV && detail && (
        <pre className="max-w-full overflow-auto rounded bg-muted p-3 text-left text-xs">
          {detail}
        </pre>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  )
}
