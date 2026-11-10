import { describe, expect, it } from 'vitest'

import { purchaseDefaultValues, purchaseSchema, toPurchaseRequest } from './purchase'

const valid = {
  ...purchaseDefaultValues({ fullName: 'Ana Souza', email: 'ANA@x.test' }, 'MEDIO'),
  cpf: '529.982.247-25',
  phone: '(71) 99876-5432',
  cep: '40170-115',
  street: 'Av. Adhemar de Barros',
  number: '500',
  complement: '  ',
  neighborhood: 'Ondina',
  city: 'Salvador',
  state: 'BA',
}

describe('purchaseSchema', () => {
  it('aceita dados válidos e monta o corpo da API só com dígitos', () => {
    const parsed = purchaseSchema.parse(valid)
    expect(toPurchaseRequest(parsed, 'PIX')).toEqual({
      packageId: 'MEDIO',
      method: 'PIX',
      billing: {
        fullName: 'Ana Souza',
        email: 'ana@x.test',
        cpf: '52998224725',
        phone: '71998765432',
        cep: '40170115',
        street: 'Av. Adhemar de Barros',
        number: '500',
        neighborhood: 'Ondina',
        city: 'Salvador',
        state: 'BA',
      },
    })
  })

  it('exige pacote e valida telefone, CEP, CPF e UF', () => {
    const result = purchaseSchema.safeParse({
      ...valid,
      packageId: undefined,
      phone: '(71) 8987-654',
      cep: '4017',
      cpf: '111.111.111-11',
      state: 'XX',
    })
    expect(result.success).toBe(false)
    const messages = Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
    )
    expect(messages).toEqual({
      packageId: 'Escolha um pacote.',
      phone: 'Telefone inválido.',
      cep: 'CEP inválido.',
      cpf: 'CPF inválido.',
      state: 'Selecione o estado.',
    })
  })
})
