import { ConstructionIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent } from '@/shared/components/ui/card'

/** Marca uma tela ainda não implementada (as telas finais virão do Figma). */
export function PagePlaceholder({
  requirement,
  children,
}: {
  requirement: string
  children?: ReactNode
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <ConstructionIcon className="size-6" aria-hidden />
        <p className="font-medium text-foreground">Tela em construção</p>
        <p className="text-sm">{requirement}</p>
        {children}
      </CardContent>
    </Card>
  )
}
