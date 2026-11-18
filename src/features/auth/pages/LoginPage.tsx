import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { MailWarningIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'

import {
  applyProblemDetailToForm,
  getErrorMessage,
  getProblemDetail,
} from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { FieldGroup } from '@/shared/components/ui/field'

import { useLogin } from '../api/auth'
import { AuthCard } from '../components/AuthCard'
import { ResendConfirmationEmail } from '../components/ResendConfirmationEmail'
import { EMAIL_NOT_CONFIRMED_CODE, focusOnMount, focusTargetClass } from '../lib/email-confirmation'
import { authLinkClass } from '../lib/styles'
import { loginSchema, type LoginFormValues } from '../schemas/auth'

type LoginLocationState = { email?: string } | null

export function LoginPage() {
  const location = useLocation()
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  /** 403 `EMAIL_NAO_CONFIRMADO`: e-mail digitado e um contador que remonta (e foca) o aviso. */
  const [unconfirmed, setUnconfirmed] = useState<{ email: string; attempt: number } | null>(null)

  const initialEmail = (location.state as LoginLocationState)?.email ?? ''

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      // O login busca o usuário em ['me'] e o <RedirectIfAuthenticated> leva para o
      // `?redirect=` (ou `/`). Navegar aqui também causaria duas navegações concorrentes.
      await login.mutateAsync(values)
    } catch (error) {
      // A senha está certa, mas falta confirmar o e-mail (o 403 de CSRF vem com outro código).
      if (
        isAxiosError(error) &&
        error.response?.status === 403 &&
        getProblemDetail(error)?.code === EMAIL_NOT_CONFIRMED_CODE
      ) {
        setUnconfirmed((prev) => ({ email: values.email, attempt: (prev?.attempt ?? 0) + 1 }))
        return
      }
      setUnconfirmed(null)
      if (isAxiosError(error) && error.response?.status === 401) {
        setFormError(getErrorMessage(error))
        return
      }
      setFormError(applyProblemDetailToForm(error, form.setError))
    }
  })

  return (
    <AuthCard title="Acesse sua conta">
      {unconfirmed && (
        // Fora do <form> de login: o reenvio é outro formulário.
        <div className="flex flex-col gap-4">
          <Alert
            key={unconfirmed.attempt}
            ref={focusOnMount}
            tabIndex={-1}
            className={focusTargetClass}
          >
            <MailWarningIcon />
            <AlertTitle>Confirme seu e-mail antes de entrar</AlertTitle>
            <AlertDescription>
              Abra o link que enviamos para{' '}
              <strong className="font-medium wrap-break-word text-foreground">
                {unconfirmed.email}
              </strong>
              . Se ele venceu ou não chegou, peça um novo.
            </AlertDescription>
          </Alert>
          <ResendConfirmationEmail key={unconfirmed.email} email={unconfirmed.email} />
        </div>
      )}
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormError message={formError} />
          <FormTextField
            control={form.control}
            name="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            autoFocus={!initialEmail}
          />
          <FormTextField
            control={form.control}
            name="password"
            label="Senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••"
            autoFocus={!!initialEmail}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
          <div className="-mt-2 flex items-center justify-between gap-4 text-sm">
            <Link to="/cadastro" className={authLinkClass}>
              Criar conta
            </Link>
            <Link to="/recuperar-senha" className={authLinkClass}>
              Esqueci a senha
            </Link>
          </div>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
