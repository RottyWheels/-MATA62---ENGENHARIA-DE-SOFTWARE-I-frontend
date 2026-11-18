import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { applyProblemDetailToForm } from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { Button } from '@/shared/components/ui/button'
import { FieldGroup } from '@/shared/components/ui/field'
import { cn } from '@/shared/lib/utils'

import { useResendConfirmation } from '../api/auth'
import { focusOnMount, focusTargetClass, RESEND_COOLDOWN_SECONDS } from '../lib/email-confirmation'
import { resendConfirmationSchema, type ResendConfirmationFormValues } from '../schemas/auth'

/** Segundos que faltam para liberar o botão; `start()` recomeça a contagem. */
function useCooldown(seconds: number) {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (endsAt === null) return
    const id = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt) setEndsAt(null)
    }, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))
  const start = () => {
    const current = Date.now()
    setNow(current)
    setEndsAt(current + seconds * 1000)
  }
  return { remaining, start }
}

type ResendConfirmationEmailProps = {
  /** E-mail já conhecido (cadastro, login). Sem ele, a tela mostra um campo de e-mail. */
  email?: string
  variant?: 'default' | 'outline'
}

/**
 * Botão "Reenviar e-mail" do link de confirmação. A resposta é sempre 202 e a mensagem é sempre a
 * mesma, para não revelar se o e-mail tem conta. Depois de um envio, o botão fica desativado por
 * 60 s (o backend ignora reenvios mais rápidos para a mesma conta).
 */
export function ResendConfirmationEmail({
  email,
  variant = 'outline',
}: ResendConfirmationEmailProps) {
  const resend = useResendConfirmation()
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS)
  // Muda a cada envio: remonta a mensagem, que recebe o foco de novo.
  const [sentCount, setSentCount] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ResendConfirmationFormValues>({
    resolver: zodResolver(resendConfirmationSchema),
    defaultValues: { email: email ?? '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (cooldown.remaining > 0) return
    setFormError(null)
    try {
      await resend.mutateAsync({ email: email ?? values.email })
      cooldown.start()
      setSentCount((count) => count + 1)
    } catch (error) {
      setFormError(applyProblemDetailToForm(error, form.setError))
    }
  })

  const waiting = cooldown.remaining > 0
  const submitting = form.formState.isSubmitting

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-4">
        <FormError message={formError} />
        {email === undefined && (
          <FormTextField
            control={form.control}
            name="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
          />
        )}
        <Button type="submit" variant={variant} className="w-full" disabled={submitting || waiting}>
          {submitting
            ? 'Enviando…'
            : waiting
              ? `Reenviar e-mail (${cooldown.remaining} s)`
              : 'Reenviar e-mail'}
        </Button>
        {sentCount > 0 && (
          <p
            key={sentCount}
            ref={focusOnMount}
            tabIndex={-1}
            role="status"
            className={cn('rounded-sm text-sm text-muted-foreground', focusTargetClass)}
          >
            Se houver uma conta pendente com esse e-mail, enviamos um novo link. Use o link do
            e-mail mais recente: cada reenvio invalida os anteriores.
            <span className="sr-only">
              {' '}
              Você poderá pedir outro envio em {RESEND_COOLDOWN_SECONDS} segundos.
            </span>
          </p>
        )}
      </FieldGroup>
    </form>
  )
}
