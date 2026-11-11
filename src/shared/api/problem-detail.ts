import { isAxiosError } from 'axios'
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'

/**
 * Erro da API. O backend responde com o `ErrorResponse` dele
 * (`{ timestamp, status, code, message, errors }`); os campos do RFC 9457
 * (`title`, `detail`) continuam aceitos.
 */
export type ProblemDetail = {
  status: number
  /** Código estável do backend, ex.: `EMAIL_JA_CADASTRADO`, `DADOS_INVALIDOS`. */
  code?: string
  /** Mensagem geral do backend, em português. */
  message?: string
  timestamp?: string
  type?: string
  title?: string
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
  /**
   * Tradução livre do campo, para nomes com índice
   * (ex.: `oabRegistrations[1].number` → `oabRegistrations.1.oab`). Tem prioridade sobre `fieldMap`.
   */
  resolveField?: (field: string) => FieldPath<T> | undefined
  /**
   * Erros sem `errors[]` que pertencem a um campo, pelo `code`
   * (ex.: `EMAIL_JA_CADASTRADO` → `email`). A mensagem vai para o campo.
   */
  codeMap?: Partial<Record<string, FieldPath<T>>>
}

/** Mensagem geral do erro, para o topo do formulário ou um toast. */
export function getErrorMessage(error: unknown): string {
  const problem = getProblemDetail(error)
  return problem?.message ?? problem?.detail ?? problem?.title ?? GENERIC_ERROR_MESSAGE
}

/** `oabRegistrations[0].number` → `oabRegistrations`: permite mapear listas pelo nome base. */
function baseField(field: string) {
  return field.replace(/[[.].*$/, '')
}

/**
 * Aplica os erros de campo no React Hook Form e retorna a mensagem geral
 * (`message`/`detail`/`title`) para exibir no topo do formulário.
 */
export function applyProblemDetailToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: ApplyOptions<T> = {},
): string {
  const problem = getProblemDetail(error)
  if (!problem) return GENERIC_ERROR_MESSAGE

  const general = problem.message ?? problem.detail ?? problem.title ?? GENERIC_ERROR_MESSAGE

  let focused = false
  for (const { field, message } of problem.errors ?? []) {
    const path =
      options.resolveField?.(field) ??
      options.fieldMap?.[field] ??
      options.fieldMap?.[baseField(field)] ??
      (field as FieldPath<T>)
    setError(path, { type: 'server', message }, { shouldFocus: !focused })
    focused = true
  }

  const codeField = problem.code ? options.codeMap?.[problem.code] : undefined
  if (codeField) {
    setError(codeField, { type: 'server', message: general }, { shouldFocus: !focused })
  }

  return general
}
