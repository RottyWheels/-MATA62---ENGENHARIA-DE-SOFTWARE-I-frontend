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

  it('lê o ErrorResponse do backend (code + message)', () => {
    const setError = vi.fn()
    const error = axiosErrorWith({
      timestamp: '2026-11-11T12:00:00Z',
      status: 400,
      code: 'DADOS_INVALIDOS',
      message: 'Dados inválidos.',
      errors: [{ field: 'oabRegistrations[0].number', message: 'deve ter até 6 dígitos' }],
    })
    expect(
      applyProblemDetailToForm(error, setError, { fieldMap: { oabRegistrations: 'oab' } }),
    ).toBe('Dados inválidos.')
    expect(setError).toHaveBeenCalledWith(
      'oab',
      { type: 'server', message: 'deve ter até 6 dígitos' },
      { shouldFocus: true },
    )
  })

  it('usa codeMap para levar um erro sem campos (409) a um campo', () => {
    const setError = vi.fn()
    const message = applyProblemDetailToForm(
      axiosErrorWith(
        { status: 409, code: 'EMAIL_JA_CADASTRADO', message: 'E-mail já cadastrado.', errors: [] },
        409,
      ),
      setError,
      { codeMap: { EMAIL_JA_CADASTRADO: 'email' } },
    )
    expect(message).toBe('E-mail já cadastrado.')
    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'E-mail já cadastrado.' },
      { shouldFocus: true },
    )
  })

  it('retorna mensagem genérica para erros que não são ProblemDetail', () => {
    const setError = vi.fn()
    expect(applyProblemDetailToForm(new Error('rede'), setError)).toBe(GENERIC_ERROR_MESSAGE)
    expect(setError).not.toHaveBeenCalled()
  })
})
