import { Loader2Icon } from 'lucide-react'

export function FullPageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground"
    >
      <Loader2Icon className="size-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
