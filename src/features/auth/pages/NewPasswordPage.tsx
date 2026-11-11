import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, CircleCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'

import { applyProblemDetailToForm } from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { FieldGroup } from '@/shared/components/ui/field'

import { getMeQueryKey, usePasswordResetConfirm } from '../api/auth'
import { AuthCard } from '../components/AuthCard'
import { authLinkClass } from '../lib/styles'
import { newPasswordSchema, PASSWORD_HINT, type NewPasswordFormValues } from '../schemas/auth'

/**
 * Destino do link de recuperação enviado por e-mail (`/redefinir-senha?token=…`,
 * `RESET_URL` no backend). Redefinir a senha encerra todas as sessões do usuário.
 */
export function NewPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const queryClient = useQueryClient()
  const confirm = usePasswordResetConfirm()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await confirm.mutateAsync({ token, newPassword: values.password })
      queryClient.removeQueries({ queryKey: getMeQueryKey() })
    } catch (error) {
      setFormError(
        applyProblemDetailToForm(error, form.setError, { fieldMap: { newPassword: 'password' } }),
      )
    }
  })

  const footer = (
    <p className="text-right">
      <Link to="/recuperar-senha" className={authLinkClass}>
        Pedir um novo link
      </Link>
    </p>
  )

  if (!token) {
    return (
      <AuthCard title="Redefinir senha" footer={footer}>
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Link incompleto</AlertTitle>
          <AlertDescription>
            Abra o link exatamente como chegou no e-mail ou peça um novo.
          </AlertDescription>
        </Alert>
      </AuthCard>
    )
  }

  if (confirm.isSuccess) {
    return (
      <AuthCard title="Redefinir senha">
        <Alert aria-live="polite">
          <CircleCheckIcon />
          <AlertTitle>Senha alterada</AlertTitle>
          <AlertDescription>
            Por segurança, todas as sessões abertas foram encerradas.
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-6 w-full">
          <Link to="/login">Ir para o login</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Redefinir senha"
      description="Crie uma nova senha para a sua conta."
      footer={footer}
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormError message={formError} />
          <FormTextField
            control={form.control}
            name="password"
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••••"
            description={PASSWORD_HINT}
            autoFocus
          />
          <FormTextField
            control={form.control}
            name="confirmPassword"
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••••"
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
