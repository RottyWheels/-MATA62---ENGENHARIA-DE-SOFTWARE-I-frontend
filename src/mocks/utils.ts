import { HttpResponse } from 'msw'

import type { ProblemDetail } from '@/shared/api/problem-detail'

/** Resposta de erro no formato do backend (`ErrorResponse`: status, code, message, errors). */
export function problem(
  status: number,
  code: string,
  message: string,
  errors: NonNullable<ProblemDetail['errors']> = [],
) {
  const body: ProblemDetail = { timestamp: new Date().toISOString(), status, code, message, errors }
  return HttpResponse.json(body, { status })
}
