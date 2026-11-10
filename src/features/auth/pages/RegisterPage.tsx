import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { applyProblemDetailToForm } from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { CPF_MASK, UFS } from '@/shared/lib/validators'

import { useRegister } from '../api/auth'
import { AuthCard } from '../components/AuthCard'
import {
  PASSWORD_MIN_LENGTH,
  registerDefaultValues,
  registerSchema,
  toRegisterRequest,
  type RegisterFormValues,
} from '../schemas/auth'

const USER_TYPES = [
  { value: 'COMUM', label: 'Usuário comum' },
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
      toast.success('Cadastro realizado', { description: 'Entre com seu e-mail e senha.' })
      await navigate('/login', { state: { email: user.email } })
    } catch (error) {
      setFormError(
        applyProblemDetailToForm(error, form.setError, {
          fieldMap: { oabNumber: 'oabNumero' },
        }),
      )
    }
  })

  return (
    <AuthCard
      title="Criar conta"
      description="Cadastre-se para comprar créditos e registrar evidências."
      footer={
        <p>
          Já tem conta?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormError message={formError} />

          <Controller
            control={form.control}
            name="type"
            render={({ field, fieldState }) => (
              <FieldSet data-invalid={fieldState.invalid || undefined}>
                <FieldLegend variant="label">Tipo de cadastro</FieldLegend>
                <RadioGroup
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-2"
                  aria-invalid={fieldState.invalid || undefined}
                >
                  {USER_TYPES.map((option) => (
                    <FieldLabel key={option.value} htmlFor={`tipo-${option.value}`}>
                      <Field orientation="horizontal">
                        <RadioGroupItem value={option.value} id={`tipo-${option.value}`} />
                        <span>{option.label}</span>
                      </Field>
                    </FieldLabel>
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
          />
          <FormTextField
            control={form.control}
            name="email"
            label="E-mail"
            type="email"
            autoComplete="email"
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
            <div className="grid grid-cols-[1fr_7rem] items-start gap-3">
              <FormTextField
                control={form.control}
                name="oabNumero"
                label="Número da OAB"
                inputMode="numeric"
                maxLength={6}
              />
              <Controller
                control={form.control}
                name="oabUf"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="campo-oabUf">UF</FieldLabel>
                    <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="campo-oabUf"
                        ref={field.ref}
                        onBlur={field.onBlur}
                        aria-invalid={fieldState.invalid || undefined}
                        aria-describedby={fieldState.error ? 'campo-oabUf-erro' : undefined}
                        className="w-full"
                      >
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {UFS.map((uf) => (
                          <SelectItem key={uf.sigla} value={uf.sigla}>
                            {uf.sigla}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError id="campo-oabUf-erro" errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
          )}

          <FormTextField
            control={form.control}
            name="password"
            label="Senha"
            type="password"
            autoComplete="new-password"
            description={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
          />
          <FormTextField
            control={form.control}
            name="confirmPassword"
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
          />

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Cadastrando…' : 'Cadastrar'}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
