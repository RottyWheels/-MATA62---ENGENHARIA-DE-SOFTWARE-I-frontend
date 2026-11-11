import { z } from 'zod'

import {
  isValidCep,
  isValidCpf,
  isValidPhone,
  isValidUf,
  onlyDigits,
} from '@/shared/lib/validators'

import type { CreditPackageId, PaymentMethod, PurchaseRequest } from '../api/types'

const required = (message: string) => z.string().trim().min(1, message)

/** Formulário "Compra de Créditos" (Figma): pacote + dados de faturamento (Apêndice A). */
export const purchaseSchema = z.object({
  packageId: z.enum(['BASICO', 'MEDIO', 'PREMIUM'], { error: 'Escolha um pacote.' }),
  fullName: required('Informe o nome completo.'),
  email: required('Informe o e-mail.').pipe(z.email('Informe um e-mail válido.')),
  cpf: required('Informe o CPF.').refine(isValidCpf, 'CPF inválido.'),
  phone: required('Informe o telefone.').refine(isValidPhone, 'Telefone inválido.'),
  cep: required('Informe o CEP.').refine(isValidCep, 'CEP inválido.'),
  street: required('Informe o endereço.'),
  number: required('Informe o número (ou S/N).'),
  complement: z.string().trim(),
  neighborhood: required('Informe o bairro.'),
  city: required('Informe a cidade.'),
  state: z.string().refine(isValidUf, 'Selecione o estado.'),
})

export type PurchaseFormValues = z.input<typeof purchaseSchema>

export function purchaseDefaultValues(
  user?: { fullName: string; email: string },
  packageId?: CreditPackageId,
): PurchaseFormValues {
  return {
    packageId: packageId as CreditPackageId,
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    cpf: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  }
}

/** Converte o formulário no corpo da API (telefone, CPF e CEP só com dígitos). */
export function toPurchaseRequest(
  values: z.output<typeof purchaseSchema>,
  method: PaymentMethod,
): PurchaseRequest {
  const complement = values.complement.trim()
  return {
    packageId: values.packageId,
    method,
    billing: {
      fullName: values.fullName,
      email: values.email.toLowerCase(),
      cpf: onlyDigits(values.cpf),
      phone: onlyDigits(values.phone),
      cep: onlyDigits(values.cep),
      street: values.street,
      number: values.number,
      ...(complement ? { complement } : {}),
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state,
    },
  }
}
