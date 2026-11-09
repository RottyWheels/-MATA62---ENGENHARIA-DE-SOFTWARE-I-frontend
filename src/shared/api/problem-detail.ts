import { isAxiosError } from 'axios'
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'

/** Erro no formato RFC 9457 (Spring `ProblemDetail`). */
export type ProblemDetail = {
  type?: string
  title?: string
  status: number
  detail?: string
  instance?: string
  errors?: Array<{ field: string; message: string }>
}

export const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir a operação. Tente novamente.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isProblemDetail(value: unknown): value is ProblemDetail {
  if (!isRecord(value) || typeof value.status !== 'number') return false
  if (value.errors === undefined) return true
  return (
    Array.isArray(value.errors) &&
    value.errors.every(
      (e) => isRecord(e) && typeof e.field === 'string' && typeof e.message === 'string',
    )
  )
}

/** Extrai o ProblemDetail de um erro do Axios (ou de um objeto já desserializado). */
export function getProblemDetail(error: unknown): ProblemDetail | undefined {
  // AxiosError também tem `status` numérico: verifique-o antes do formato bruto.
  if (isAxiosError(error)) {
    const data: unknown = error.response?.data
    return isProblemDetail(data) ? data : undefined
  }
  return isProblemDetail(error) ? error : undefined
}

type ApplyOptions<T extends FieldValues> = {
  /** Mapeia o nome do campo no backend para o caminho no formulário. */
  fieldMap?: Partial<Record<string, FieldPath<T>>>
}

/**
 * Aplica os erros de campo do ProblemDetail no React Hook Form e retorna a
 * mensagem geral (`detail`/`title`) para exibir no topo do formulário.
 */
export function applyProblemDetailToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: ApplyOptions<T> = {},
): string {
  const problem = getProblemDetail(error)
  if (!problem) return GENERIC_ERROR_MESSAGE

  let focused = false
  for (const { field, message } of problem.errors ?? []) {
    const path = options.fieldMap?.[field] ?? (field as FieldPath<T>)
    setError(path, { type: 'server', message }, { shouldFocus: !focused })
    focused = true
  }

  return problem.detail ?? problem.title ?? GENERIC_ERROR_MESSAGE
}
