import { http as mswHttp, HttpResponse } from 'msw'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import { buildLoginRedirect, http, setUnauthorizedHandler } from './http'

const url = (path: string) => new URL(`/api${path}`, window.location.origin).toString()

describe('http', () => {
  it('usa /api como base e envia cookies', () => {
    expect(http.defaults.baseURL).toBe('/api')
    expect(http.defaults.withCredentials).toBe(true)
    expect(http.defaults.xsrfCookieName).toBe('XSRF-TOKEN')
    expect(http.defaults.xsrfHeaderName).toBe('X-XSRF-TOKEN')
  })

  it('redireciona para o login em 401 de endpoints comuns', async () => {
    const redirect = vi.fn()
    setUnauthorizedHandler(redirect)
    server.use(mswHttp.get(url('/registros'), () => new HttpResponse(null, { status: 401 })))

    await expect(http.get('/registros')).rejects.toThrow()
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('não redireciona em 401 de /me (tratado pelo RequireAuth)', async () => {
    const redirect = vi.fn()
    setUnauthorizedHandler(redirect)
    server.use(mswHttp.get(url('/me'), () => new HttpResponse(null, { status: 401 })))

    await expect(http.get('/me')).rejects.toThrow()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('mostra toast em 403', async () => {
    const spy = vi.spyOn(toast, 'error')
    server.use(mswHttp.get(url('/x'), () => new HttpResponse(null, { status: 403 })))

    await expect(http.get('/x')).rejects.toThrow()
    expect(spy).toHaveBeenCalledWith('Acesso negado', expect.anything())
  })

  it('monta o redirect com a rota atual', () => {
    expect(buildLoginRedirect({ pathname: '/registros/1', search: '?a=1', hash: '' })).toBe(
      '/login?redirect=%2Fregistros%2F1%3Fa%3D1',
    )
    expect(buildLoginRedirect({ pathname: '/', search: '', hash: '' })).toBe('/login')
  })
})
