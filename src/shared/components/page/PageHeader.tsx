import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

/** Título grande + subtítulo verde (Figma). */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-primary">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
