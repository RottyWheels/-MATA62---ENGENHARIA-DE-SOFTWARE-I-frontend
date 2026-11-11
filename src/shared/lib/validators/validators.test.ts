import { describe, expect, it } from 'vitest'

import { formatCep, isValidCep } from './cep'
import { formatCpf, isValidCpf } from './cpf'
import { formatOab, isValidOabNumber, parseOab } from './oab'
import { formatPhone, isValidLandline, isValidMobile, isValidPhone } from './phone'
import { isValidUf, UFS } from './uf'

describe('CPF', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])('aceita CPF válido %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true)
  })

  it.each([
    ['dígito verificador errado', '529.982.247-24'],
    ['dígitos repetidos', '111.111.111-11'],
    ['tamanho curto', '529.982.247'],
    ['tamanho longo', '529982247251'],
    ['vazio', ''],
  ])('rejeita CPF com %s', (_, cpf) => {
    expect(isValidCpf(cpf)).toBe(false)
  })

  it('formata com máscara', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25')
    expect(formatCpf('5299822')).toBe('529.982.2')
  })
})

describe('CEP', () => {
  it.each(['40170-115', '40170115', ' 88040-900 '])('aceita %s', (cep) => {
    expect(isValidCep(cep)).toBe(true)
  })

  it.each(['4017-0115', '401701', '40170-1155', 'abcde-fgh', ''])('rejeita %s', (cep) => {
    expect(isValidCep(cep)).toBe(false)
  })

  it('formata com máscara', () => {
    expect(formatCep('40170115')).toBe('40170-115')
  })
})

describe('Telefone', () => {
  it('aceita celular com 11 dígitos começando com 9', () => {
    expect(isValidMobile('(71) 99876-5432')).toBe(true)
    expect(isValidPhone('71998765432')).toBe(true)
  })

  it('aceita fixo com 10 dígitos começando com 2 a 5', () => {
    expect(isValidLandline('(71) 3283-6000')).toBe(true)
    expect(isValidPhone('4832216000')).toBe(true)
  })

  it.each([
    ['DDD com zero', '(01) 99876-5432'],
    ['celular sem o 9', '(71) 89876-5432'],
    ['fixo começando com 9 e 10 dígitos', '(71) 9283-6000'],
    ['curto', '(71) 3283-600'],
    ['vazio', ''],
  ])('rejeita %s', (_, phone) => {
    expect(isValidPhone(phone)).toBe(false)
  })

  it('formata fixo e celular', () => {
    expect(formatPhone('7132836000')).toBe('(71) 3283-6000')
    expect(formatPhone('71998765432')).toBe('(71) 99876-5432')
  })
})

describe('OAB e UF', () => {
  it('tem as 27 UFs', () => {
    expect(UFS).toHaveLength(27)
    expect(isValidUf('BA')).toBe(true)
    expect(isValidUf('XX')).toBe(false)
  })

  it('valida o número', () => {
    expect(isValidOabNumber('12345')).toBe(true)
    expect(isValidOabNumber('1234567')).toBe(false)
    expect(isValidOabNumber('12a45')).toBe(false)
  })

  it('formata e interpreta "<numero>/<UF>"', () => {
    expect(formatOab('12345', 'BA')).toBe('12345/BA')
    expect(parseOab('12345/sc')).toEqual({ numero: '12345', uf: 'SC' })
    expect(parseOab('12345/XX')).toBeNull()
    // Como o backend: número zero não é inscrição válida.
    expect(parseOab('000/BA')).toBeNull()
    expect(isValidOabNumber('0')).toBe(false)
  })
})
