import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'

/**
 * Tela provisória: apenas confirma que o ambiente está de pé.
 * As rotas (`router.tsx`) e os layouts serão adicionados nas próximas etapas.
 */
export function App() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Veridt</h1>
          </CardTitle>
          <CardDescription>Ambiente do frontend configurado.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
