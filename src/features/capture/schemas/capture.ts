import { z } from 'zod'

import type { CreateCaptureRequest } from '../api/types'

export const CAPTURE_TITLE_MAX_LENGTH = 150

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

export const newCaptureSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Informe o título do registro.')
    .max(
      CAPTURE_TITLE_MAX_LENGTH,
      `O título deve ter no máximo ${CAPTURE_TITLE_MAX_LENGTH} caracteres.`,
    ),
  url: z
    .string()
    .trim()
    .min(1, 'Informe o endereço do site.')
    .refine(isHttpUrl, 'Informe o endereço completo, começando com http:// ou https://.'),
})

export type NewCaptureFormValues = z.infer<typeof newCaptureSchema>

export const newCaptureDefaultValues: NewCaptureFormValues = { title: '', url: '' }

export function toCreateCaptureRequest(values: NewCaptureFormValues): CreateCaptureRequest {
  return { title: values.title.trim().replace(/\s+/g, ' '), url: values.url.trim() }
}
