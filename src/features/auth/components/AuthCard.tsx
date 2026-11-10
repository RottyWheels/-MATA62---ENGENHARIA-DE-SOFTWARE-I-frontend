import type { ReactNode } from 'react'

type AuthCardProps = {
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Cabeçalho + conteúdo das telas públicas. Sem cartão: no Figma o formulário fica solto. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
      {footer && <div className="text-sm">{footer}</div>}
    </section>
  )
}
