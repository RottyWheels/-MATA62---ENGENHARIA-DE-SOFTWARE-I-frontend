import { CircleAlertIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/shared/components/ui/alert'

/** Erro geral do formulário (ex.: `detail` do ProblemDetail). */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <Alert variant="destructive" aria-live="assertive">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
