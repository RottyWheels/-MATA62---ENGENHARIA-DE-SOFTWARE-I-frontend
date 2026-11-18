import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'
import { createQueryClient } from '@/shared/api/query-client'

import { ResendConfirmationEmail } from './ResendConfirmationEmail'

const SENT = /Se houver uma conta pendente com esse e-mail, enviamos um novo link/

function renderResend(email?: string) {
  // O relógio falso também controla a contagem regressiva (setInterval e Date.now).
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ResendConfirmationEmail email={email} />
    </QueryClientProvider>,
  )
  return { user }
}

/** Corpos enviados a `/resend` (a resposta continua a dos mocks). */
function spyResend() {
  const bodies: unknown[] = []
  server.events.on('request:start', async ({ request }) => {
    if (request.url.endsWith('/email-confirmation/resend'))
      bodies.push(await request.clone().json())
  })
  return bodies
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  server.events.removeAllListeners()
  vi.useRealTimers()
})

describe('ResendConfirmationEmail', () => {
  it('mostra sempre a mesma mensagem e bloqueia o botão por 60 s, com contagem regressiva', async () => {
    const bodies = spyResend()
    const { user } = renderResend('ana@exemplo.com')

    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    const message = await screen.findByText(SENT)
    expect(message).toHaveFocus()
    expect(message).toHaveTextContent('Use o link do e-mail mais recente')
    expect(screen.getByRole('button', { name: 'Reenviar e-mail (60 s)' })).toBeDisabled()

    act(() => vi.advanceTimersByTime(30_000))
    expect(screen.getByRole('button', { name: 'Reenviar e-mail (30 s)' })).toBeDisabled()

    act(() => vi.advanceTimersByTime(29_000))
    expect(screen.getByRole('button', { name: 'Reenviar e-mail (1 s)' })).toBeDisabled()

    act(() => vi.advanceTimersByTime(1_000))
    const button = screen.getByRole('button', { name: 'Reenviar e-mail' })
    expect(button).toBeEnabled()

    await user.click(button)
    expect(await screen.findByRole('button', { name: 'Reenviar e-mail (60 s)' })).toBeDisabled()
    expect(bodies).toEqual([{ email: 'ana@exemplo.com' }, { email: 'ana@exemplo.com' }])
  })

  it('não revela se o e-mail existe: a resposta é a mesma para qualquer endereço', async () => {
    const { user } = renderResend('ninguem@exemplo.com')

    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    expect(await screen.findByText(SENT)).toBeInTheDocument()
  })

  it('sem e-mail conhecido, pede o endereço e valida antes de enviar', async () => {
    const bodies = spyResend()
    const { user } = renderResend()

    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))
    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    expect(await screen.findByText(SENT)).toBeInTheDocument()
    expect(bodies).toEqual([{ email: 'ana@exemplo.com' }])
  })

  it('se o envio falhar, mostra o erro e não bloqueia o botão', async () => {
    server.use(
      http.post('*/api/auth/email-confirmation/resend', () =>
        HttpResponse.json({ status: 500, code: 'ERRO_INTERNO' }, { status: 500 }),
      ),
    )
    const { user } = renderResend('ana@exemplo.com')

    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    expect(await screen.findByText(/Não foi possível concluir a operação/)).toBeInTheDocument()
    expect(screen.queryByText(SENT)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reenviar e-mail' })).toBeEnabled()
  })
})
