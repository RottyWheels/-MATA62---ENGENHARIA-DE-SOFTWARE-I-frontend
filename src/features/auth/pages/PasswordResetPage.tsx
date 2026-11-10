import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { applyProblemDetailToForm } from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { FieldGroup } from '@/shared/components/ui/field'

import { usePasswordReset } from '../api/auth'
import { AuthCard } from '../components/AuthCard'
import { passwordResetSchema, type PasswordResetFormValues } from '../schemas/auth'

export function PasswordResetPage() {
  const passwordReset = usePasswordReset()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await passwordReset.mutateAsync(values)
    } catch (error) {
      setFormError(applyProblemDetailToForm(error, form.setError))
    }
  })

  return (
    <AuthCard
      title="Recuperar senha"
      description="Informe o e-mail da sua conta para receber as instruções."
      footer={
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Voltar para o login
        </Link>
      }
    >
      {passwordReset.isSuccess ? (
        <Alert aria-live="polite">
          <MailCheckIcon />
          <AlertTitle>Verifique seu e-mail</AlertTitle>
          <AlertDescription>
            Se houver uma conta com este e-mail, enviaremos as instruções para criar uma nova senha.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <FormError message={formError} />
            <FormTextField
              control={form.control}
              name="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              autoFocus
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enviando…' : 'Enviar instruções'}
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthCard>
  )
}
