import { CircleAlertIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry: () => void
  retrying: boolean
}

/**
 * A sessão falhou depois de aberta (canvas: "Novo Registro · falhou"). O
 * crédito só é descontado ao concluir, então nada foi cobrado.
 */
export function CaptureFailedDialog({ open, onOpenChange, onRetry, retrying }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" role="alertdialog">
        <DialogHeader className="items-start gap-3">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-full bg-red-100 text-red-700"
          >
            <CircleAlertIcon className="size-5" />
          </span>
          <DialogTitle className="text-xl">A captura falhou</DialogTitle>
          <DialogDescription className="text-left">
            O navegador seguro perdeu a conexão com o site antes da conclusão e os arquivos desta
            sessão não puderam ser salvos. <strong>Nenhum crédito foi cobrado.</strong>
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
          Se o problema continuar, tente mais tarde ou confira se o site exige login.
        </p>
        <DialogFooter>
          <Button asChild variant="secondary">
            <Link to="/registros">Voltar para a lista</Link>
          </Button>
          <Button onClick={onRetry} disabled={retrying}>
            {retrying ? 'Abrindo…' : 'Tentar novamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
