import { z } from 'zod'

import { isValidCpf, onlyDigits, parseOab } from '@/shared/lib/validators'

import type { RegisterRequest } from '../api/types'

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
    // OAB no formato `000000/UF` (Figma): só aparece e só é obrigatória para advogado.
    oab: z.string(),
  })
  .superRefine(
    (data, ctx) => {
      passwordsMatch(data, ctx)
      if (data.type === 'ADVOGADO') {
        if (!data.oab.trim()) {
          ctx.addIssue({ code: 'custom', path: ['oab'], message: 'Informe o número da OAB.' })
        } else if (!parseOab(data.oab)) {
          ctx.addIssue({
            code: 'custom',
            path: ['oab'],
            message: 'Use o formato número/UF, ex.: 12345/BA.',
          })
        }
      }
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
  oab: '',
}

/**
 * Converte o formulário no corpo da API: CPF só com dígitos e a OAB `000000/UF`
 * como a inscrição principal do advogado.
 */
export function toRegisterRequest(values: RegisterFormValues): RegisterRequest {
  const request: RegisterRequest = {
    type: values.type,
    fullName: values.fullName.trim().replace(/\s+/g, ' '),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    cpf: onlyDigits(values.cpf),
  }
  const oab = values.type === 'ADVOGADO' ? parseOab(values.oab) : null
  if (oab) request.oabRegistrations = [{ number: oab.numero, state: oab.uf, type: 'PRINCIPAL' }]
  return request
}
