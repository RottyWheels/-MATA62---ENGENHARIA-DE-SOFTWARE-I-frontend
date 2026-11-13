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
  onConfirm: () => void
  pending: boolean
}

/** Confirmação antes de descartar a sessão: nada é cobrado, mas as capturas se perdem. */
export function CancelCaptureDialog({ open, onOpenChange, onConfirm, pending }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} role="alertdialog">
        <DialogHeader>
          <DialogTitle>Cancelar este registro?</DialogTitle>
          <DialogDescription>
            As capturas e a gravação desta sessão serão descartadas. Nenhum crédito será cobrado.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Continuar registrando
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? 'Cancelando…' : 'Cancelar registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
