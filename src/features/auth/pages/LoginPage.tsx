import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'

import { applyProblemDetailToForm, getProblemDetail } from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { Button } from '@/shared/components/ui/button'
import { FieldGroup } from '@/shared/components/ui/field'

import { useLogin } from '../api/auth'
import { AuthCard } from '../components/AuthCard'
import { authLinkClass } from '../lib/styles'
import { loginSchema, type LoginFormValues } from '../schemas/auth'

type LoginLocationState = { email?: string } | null

export function LoginPage() {
  const location = useLocation()
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)

  const initialEmail = (location.state as LoginLocationState)?.email ?? ''

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      // Ao gravar o usuário na query ['me'], o <RedirectIfAuthenticated> leva para o
      // `?redirect=` (ou `/`). Navegar aqui também causaria duas navegações concorrentes.
      await login.mutateAsync(values)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        setFormError(getProblemDetail(error)?.detail ?? 'E-mail ou senha inválidos.')
        return
      }
      setFormError(applyProblemDetailToForm(error, form.setError))
    }
  })

  return (
    <AuthCard title="Acesse sua conta">
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
