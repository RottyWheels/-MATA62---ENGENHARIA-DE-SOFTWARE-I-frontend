import { describe, expect, it } from 'vitest'

import {
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  loginSchema,
  PASSWORD_MAX_LENGTH,
  registerDefaultValues,
  registerSchema,
} from './auth'

const valid = {
  ...registerDefaultValues,
  fullName: 'Ana Souza',
  email: 'ana@veridt.test',
  password: 'Senha#Forte1',
  confirmPassword: 'Senha#Forte1',
  cpf: '529.982.247-25',
}

function messagesFor(
  result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) {
  return result.error?.issues.filter((i) => i.path[0] === field).map((i) => i.message) ?? []
}

/** E-mail com exatamente `length` caracteres. */
function emailOfLength(length: number) {
  const domain = '@veridt.test'
  return 'a'.repeat(length - domain.length) + domain
}

describe('limites de tamanho do backend', () => {
  it('aceita nome e e-mail no limite', () => {
    const fullName = `Ana ${'b'.repeat(FULL_NAME_MAX_LENGTH - 4)}`
    expect(fullName).toHaveLength(FULL_NAME_MAX_LENGTH)

    const result = registerSchema.safeParse({
      ...valid,
      fullName,
      email: emailOfLength(EMAIL_MAX_LENGTH),
    })

    expect(result.success).toBe(true)
  })

  it('recusa nome e e-mail acima do limite, como o backend', () => {
    const result = registerSchema.safeParse({
      ...valid,
      fullName: `Ana ${'b'.repeat(FULL_NAME_MAX_LENGTH)}`,
      email: emailOfLength(EMAIL_MAX_LENGTH + 1),
    })

    expect(messagesFor(result, 'fullName')).toContain(
      `O nome deve ter no máximo ${FULL_NAME_MAX_LENGTH} caracteres.`,
    )
    expect(messagesFor(result, 'email')).toContain(
      `O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`,
    )
  })

  it('no login, recusa senha acima de 128 caracteres', () => {
    const result = loginSchema.safeParse({
      email: 'ana@veridt.test',
      password: 'a'.repeat(PASSWORD_MAX_LENGTH + 1),
    })

    expect(messagesFor(result, 'password')).toContain(
      `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
    )
  })
})
