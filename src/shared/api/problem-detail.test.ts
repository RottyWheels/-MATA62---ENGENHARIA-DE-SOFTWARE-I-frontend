import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import {
  applyProblemDetailToForm,
  GENERIC_ERROR_MESSAGE,
  getProblemDetail,
  isProblemDetail,
  type ProblemDetail,
} from './problem-detail'

function axiosErrorWith(data: unknown, status = 400) {
  const config = { headers: new AxiosHeaders() }
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response)
}

const problem: ProblemDetail = {
  type: 'about:blank',
  title: 'Bad Request',
  status: 400,
  detail: 'Dados inválidos.',
  errors: [
    { field: 'email', message: 'E-mail já cadastrado' },
    { field: 'cpf', message: 'CPF inválido' },
  ],
}

describe('isProblemDetail', () => {
  it('reconhece ProblemDetail', () => {
    expect(isProblemDetail(problem)).toBe(true)
    expect(isProblemDetail({ status: 500 })).toBe(true)
  })

  it('rejeita outros formatos', () => {
    expect(isProblemDetail(null)).toBe(false)
    expect(isProblemDetail({ title: 'x' })).toBe(false)
    expect(isProblemDetail({ status: 400, errors: 'x' })).toBe(false)
    expect(isProblemDetail({ status: 400, errors: [{ field: 1 }] })).toBe(false)
  })

  it('extrai de um AxiosError', () => {
    expect(getProblemDetail(axiosErrorWith(problem))).toEqual(problem)
    expect(getProblemDetail(axiosErrorWith('<html>'))).toBeUndefined()
  })
})

describe('applyProblemDetailToForm', () => {
  it('aplica erros de campo e retorna detail', () => {
    const setError = vi.fn()
    const message = applyProblemDetailToForm(axiosErrorWith(problem), setError)

    expect(message).toBe('Dados inválidos.')
    expect(setError).toHaveBeenCalledTimes(2)
    expect(setError).toHaveBeenNthCalledWith(
      1,
      'email',
      { type: 'server', message: 'E-mail já cadastrado' },
      { shouldFocus: true },
    )
    expect(setError).toHaveBeenNthCalledWith(
      2,
      'cpf',
      { type: 'server', message: 'CPF inválido' },
      { shouldFocus: false },
    )
  })

  it('usa fieldMap para traduzir nomes de campo', () => {
    const setError = vi.fn()
    applyProblemDetailToForm(
      { status: 400, errors: [{ field: 'oabNumber', message: 'Obrigatório' }] },
      setError,
      { fieldMap: { oabNumber: 'oab.numero' } },
    )
    expect(setError).toHaveBeenCalledWith(
      'oab.numero',
      { type: 'server', message: 'Obrigatório' },
      { shouldFocus: true },
    )
  })

  it('cai para title quando não há detail', () => {
    expect(applyProblemDetailToForm({ status: 401, title: 'Unauthorized' }, vi.fn())).toBe(
      'Unauthorized',
    )
  })

  it('retorna mensagem genérica para erros que não são ProblemDetail', () => {
    const setError = vi.fn()
    expect(applyProblemDetailToForm(new Error('rede'), setError)).toBe(GENERIC_ERROR_MESSAGE)
    expect(setError).not.toHaveBeenCalled()
  })
})
