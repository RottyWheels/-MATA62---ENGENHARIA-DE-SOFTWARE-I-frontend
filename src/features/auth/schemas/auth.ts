import { z } from 'zod'

import { formatOab, isValidCpf, onlyDigits, parseOab } from '@/shared/lib/validators'

import type { RegisterRequest } from '../api/types'

const email = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail.')
  .pipe(z.email('Informe um e-mail válido.'))

export const PASSWORD_MIN_LENGTH = 8

// ---- Login ----

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// ---- Recuperar senha ----

export const passwordResetSchema = z.object({ email })

export type PasswordResetFormValues = z.infer<typeof passwordResetSchema>

// ---- Cadastro ----

export const registerSchema = z
  .object({
    type: z.enum(['ADVOGADO', 'COMUM'], { error: 'Selecione o tipo de cadastro.' }),
    fullName: z
      .string()
      .trim()
      .min(1, 'Informe o nome completo.')
      .refine((v) => v.split(/\s+/).length >= 2, 'Informe nome e sobrenome.'),
    email,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`),
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
    cpf: z.string().min(1, 'Informe o CPF.').refine(isValidCpf, 'CPF inválido.'),
    // OAB no formato `000000/UF` (Figma): só aparece e só é obrigatória para advogado.
    oab: z.string(),
  })
  .superRefine(
    (data, ctx) => {
      if (data.confirmPassword && data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: 'custom',
          path: ['confirmPassword'],
          message: 'As senhas não conferem.',
        })
      }
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

/** Converte o formulário no corpo da API (CPF só com dígitos, OAB como `"<numero>/<UF>"`). */
export function toRegisterRequest(values: RegisterFormValues): RegisterRequest {
  const request: RegisterRequest = {
    type: values.type,
    fullName: values.fullName.trim().replace(/\s+/g, ' '),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    cpf: onlyDigits(values.cpf),
  }
  const oab = values.type === 'ADVOGADO' ? parseOab(values.oab) : null
  if (oab) request.oabNumber = formatOab(oab.numero, oab.uf)
  return request
}
