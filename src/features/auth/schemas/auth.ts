import { z } from 'zod'

import { isValidCpf, onlyDigits, parseOab } from '@/shared/lib/validators'

import type { OabRegistrationType, RegisterRequest } from '../api/types'

/** Limites dos DTOs do backend (`RegisterUserRequest`, `LoginRequest`). */
export const FULL_NAME_MAX_LENGTH = 150
export const EMAIL_MAX_LENGTH = 254

const email = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail.')
  .max(EMAIL_MAX_LENGTH, `O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`)
  .pipe(z.email('Informe um e-mail válido.'))

/** Política de senha do backend (`PasswordPolicy`): 8 a 128 caracteres, com letra, número e símbolo. */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const PASSWORD_HINT = `De ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres, com letra, número e símbolo.`

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`)
  .refine((v) => /\p{L}/u.test(v), 'A senha precisa ter ao menos uma letra.')
  .refine((v) => /\p{Nd}/u.test(v), 'A senha precisa ter ao menos um número.')
  .refine((v) => /[^\p{L}\p{Nd}\s]/u.test(v), 'A senha precisa ter ao menos um símbolo.')

function passwordsMatch(data: { password: string; confirmPassword: string }, ctx: z.RefinementCtx) {
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não conferem.' })
  }
}

// ---- Login ----

export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, 'Informe a senha.')
    .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// ---- Recuperar senha ----

export const passwordResetSchema = z.object({ email })

export type PasswordResetFormValues = z.infer<typeof passwordResetSchema>

// ---- Redefinir senha (link do e-mail) ----

export const newPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
  })
  .superRefine(passwordsMatch, { when: () => true })

export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>

// ---- Cadastro ----

export const OAB_REGISTRATION_TYPES = ['PRINCIPAL', 'SUPLEMENTAR', 'ESTAGIARIO'] as const
/** Limite do backend (`RegisterUserRequest.oabRegistrations`). */
export const OAB_MAX_REGISTRATIONS = 30

export const OAB_REGISTRATION_TYPE_LABELS: Record<OabRegistrationType, string> = {
  PRINCIPAL: 'Principal',
  SUPLEMENTAR: 'Suplementar',
  ESTAGIARIO: 'Estagiário',
}

type OabRegistrationFormValue = { oab: string; type: OabRegistrationType }

export function emptyOabRegistration(
  type: OabRegistrationType = 'PRINCIPAL',
): OabRegistrationFormValue {
  return { oab: '', type }
}

/** Mesmas regras do `OabValidator` do backend, com o erro no campo certo de cada inscrição. */
function validateOabRegistrations(registrations: OabRegistrationFormValue[], ctx: z.RefinementCtx) {
  if (registrations.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['oabRegistrations'],
      message: 'Informe ao menos uma inscrição na OAB.',
    })
    return
  }

  const seen = new Set<string>()
  let principals = 0
  registrations.forEach((registration, index) => {
    const path = ['oabRegistrations', index]
    if (!registration.oab.trim()) {
      ctx.addIssue({ code: 'custom', path: [...path, 'oab'], message: 'Informe o número da OAB.' })
      return
    }
    const parsed = parseOab(registration.oab)
    if (!parsed) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'oab'],
        message: 'Use o formato número/UF, ex.: 12345/BA.',
      })
      return
    }
    // O backend ignora zeros à esquerda: 00123/BA e 123/BA são a mesma inscrição.
    const key = `${Number(parsed.numero)}/${parsed.uf}/${registration.type}`
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: [...path, 'oab'], message: 'Inscrição repetida.' })
    }
    seen.add(key)
    if (registration.type === 'PRINCIPAL' && ++principals > 1) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'type'],
        message: 'Só pode haver uma inscrição principal.',
      })
    }
  })
}

export const registerSchema = z
  .object({
    type: z.enum(['ADVOGADO', 'COMUM'], { error: 'Selecione o tipo de cadastro.' }),
    fullName: z
      .string()
      .trim()
      .min(1, 'Informe o nome completo.')
      .max(FULL_NAME_MAX_LENGTH, `O nome deve ter no máximo ${FULL_NAME_MAX_LENGTH} caracteres.`)
      .refine((v) => v.split(/\s+/).length >= 2, 'Informe nome e sobrenome.'),
    email,
    password: newPassword,
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
    cpf: z.string().min(1, 'Informe o CPF.').refine(isValidCpf, 'CPF inválido.'),
    // Inscrições na OAB, cada uma no formato `000000/UF` (Figma): só aparecem e
    // só são obrigatórias para advogado.
    oabRegistrations: z
      .array(z.object({ oab: z.string(), type: z.enum(OAB_REGISTRATION_TYPES) }))
      .max(OAB_MAX_REGISTRATIONS, `Informe no máximo ${OAB_MAX_REGISTRATIONS} inscrições.`),
  })
  .superRefine(
    (data, ctx) => {
      passwordsMatch(data, ctx)
      if (data.type === 'ADVOGADO') validateOabRegistrations(data.oabRegistrations, ctx)
    },
    // Roda mesmo com erros em outros campos, para mostrar tudo de uma vez.
    { when: () => true },
  )

export type RegisterFormValues = z.infer<typeof registerSchema>

export const registerDefaultValues: RegisterFormValues = {
  type: 'COMUM',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  cpf: '',
  oabRegistrations: [emptyOabRegistration()],
}

/**
 * Converte o formulário no corpo da API: CPF só com dígitos e cada OAB `000000/UF`
 * como `{ number, state, type }` (só para advogado).
 */
export function toRegisterRequest(values: RegisterFormValues): RegisterRequest {
  const request: RegisterRequest = {
    type: values.type,
    fullName: values.fullName.trim().replace(/\s+/g, ' '),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    cpf: onlyDigits(values.cpf),
  }
  if (values.type === 'ADVOGADO') {
    request.oabRegistrations = values.oabRegistrations.flatMap(({ oab, type }) => {
      const parsed = parseOab(oab)
      return parsed ? [{ number: parsed.numero, state: parsed.uf, type }] : []
    })
  }
  return request
}
