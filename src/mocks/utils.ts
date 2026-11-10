import { HttpResponse } from 'msw'

import type { ProblemDetail } from '@/shared/api/problem-detail'

/** Resposta de erro no formato RFC 9457, como o Spring devolve. */
export function problem(
  status: number,
  title: string,
  detail?: string,
  errors?: ProblemDetail['errors'],
) {
  const body: ProblemDetail = { type: 'about:blank', title, status, detail, errors }
  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}
