import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { applyProblemDetailToForm } from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { Button } from '@/shared/components/ui/button'
import { FieldError, FieldGroup, FieldLegend, FieldSet } from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { CPF_MASK } from '@/shared/lib/validators'

import { useRegister } from '../api/auth'
import { AuthCard } from '../components/AuthCard'
import { OabRegistrationsField } from '../components/OabRegistrationsField'
import { authLinkClass } from '../lib/styles'
import {
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  PASSWORD_HINT,
  registerDefaultValues,
  registerSchema,
  toRegisterRequest,
  type RegisterFormValues,
} from '../schemas/auth'

/**
 * Traduz o campo do backend para o formulário:
 * `oabRegistrations[1].number` → `oabRegistrations.1.oab`, `[1].type` → `.1.type`.
 */
function resolveOabField(field: string): FieldPath<RegisterFormValues> | undefined {
  const match = /^oabRegistrations\[(\d+)\]\.(number|state|type)$/.exec(field)
  if (match) {
    const index = Number(match[1])
    return match[2] === 'type' ? `oabRegistrations.${index}.type` : `oabRegistrations.${index}.oab`
  }
  return field.startsWith('oabRegistrations') ? 'oabRegistrations' : undefined
}

const USER_TYPES = [
  { value: 'COMUM', label: 'Usuário Comum' },
  { value: 'ADVOGADO', label: 'Advogado' },
] as const

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaultValues,
  })
  const type = useWatch({ control: form.control, name: 'type' })
  const isLawyer = type === 'ADVOGADO'

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const user = await register.mutateAsync(toRegisterRequest(values))
      toast.success('Conta criada', { description: 'Entre com seu e-mail e senha.' })
      await navigate('/login', { state: { email: user.email } })
    } catch (error) {
      setFormError(
        applyProblemDetailToForm(error, form.setError, {
          resolveField: resolveOabField,
          codeMap: {
            EMAIL_JA_CADASTRADO: 'email',
            CPF_JA_CADASTRADO: 'cpf',
            OAB_JA_CADASTRADA: 'oabRegistrations',
          },
        }),
      )
    }
  })

  return (
    <AuthCard
      title="Criar conta"
      description="Escolha o tipo de conta e preencha seus dados."
      footer={
        <p className="text-right">
          <Link to="/login" className={authLinkClass}>
            Já tenho uma conta
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup className="gap-5">
          <FormError message={formError} />

          {/* Seletor segmentado (Figma), com semântica de radio para leitores de tela. */}
          <Controller
            control={form.control}
            name="type"
            render={({ field, fieldState }) => (
              <FieldSet>
                <FieldLegend className="sr-only">Tipo de conta</FieldLegend>
                <RadioGroup
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                >
                  {USER_TYPES.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`tipo-${option.value}`}
                      className="relative flex h-8 cursor-pointer items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-data-[state=checked]:bg-background has-data-[state=checked]:text-foreground has-data-[state=checked]:shadow-sm"
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`tipo-${option.value}`}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </RadioGroup>
                <FieldError errors={[fieldState.error]} />
              </FieldSet>
            )}
          />

          <FormTextField
            control={form.control}
            name="fullName"
            label="Nome completo"
            autoComplete="name"
            maxLength={FULL_NAME_MAX_LENGTH}
            placeholder="Seu nome completo"
          />
          <FormTextField
            control={form.control}
            name="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            placeholder="seu@email.com"
          />

          <FormTextField
            control={form.control}
            name="cpf"
            label="CPF"
            mask={CPF_MASK}
            inputMode="numeric"
            placeholder="000.000.000-00"
          />

          {isLawyer && (
            <OabRegistrationsField control={form.control} errors={form.formState.errors} />
          )}

          <FormTextField
            control={form.control}
            name="password"
            label="Senha"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••••"
            description={PASSWORD_HINT}
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
            {form.formState.isSubmitting ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
